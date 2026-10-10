import { generateText } from 'ai';
import { z } from 'zod';
import { getProvider } from '@/lib/ai-provider';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let reqBody: any = {};
  try {
    reqBody = await req.json();
    const { 
      interviewMode, targetRole, targetCompany, technicalField, experienceLevel, 
      roundType, questionCount, difficulty, resumeText, previousQuestions
    } = reqBody;

    const { model } = getProvider();

    const isGenericCompany = !targetCompany || targetCompany.toLowerCase().includes('generic');
    const companyContext = isGenericCompany 
      ? `You are an expert technical interviewer conducting a standard industry interview.` 
      : `You are an expert technical interviewer for ${targetCompany}. Provide company-tailored practice questions relevant to this company's known interview style, but DO NOT falsely label them as 'official' questions.`;

    const isGenericMode = interviewMode === 'Generic';
    
    let roundContext = '';
    if (isGenericMode) {
      roundContext = `Generate a balanced mix of ${questionCount} questions across relevant categories (e.g., Aptitude, Coding/DSA, Technical/CS Concepts, Problem-solving, Behavioral/HR) suitable for a ${experienceLevel} ${targetRole}.`;
    } else {
      roundContext = `Generate exactly ${questionCount} distinct questions strictly for a ${roundType} round for a ${experienceLevel} ${targetRole} ${technicalField ? `in ${technicalField}` : ''}.
For a Technical round, ask concrete conceptual or problem-solving questions. Do not ask generic HR/introductory questions.
For a Coding round, ask algorithm or data structure problems (provide problem statement, constraints, expected I/O).
For an HR round, ask behavioral/situational questions.
For an Aptitude round, ask quantitative, logical, or numerical reasoning questions.
For a GD (Group Discussion) round, provide discussion topics.`;
    }

    const previousQContext = previousQuestions && previousQuestions.length > 0 
      ? `\nCRITICAL: Do NOT generate any questions semantically similar to these previously asked questions:\n${previousQuestions.join('\n')}`
      : '';

    const systemPrompt = `${companyContext}
${roundContext}
${resumeText ? `\nCandidate Resume Context (use for tailored follow-ups if relevant): ${resumeText.substring(0, 1000)}...` : ''}${previousQContext}

CRITICAL REQUIREMENT: Each question should be appropriately difficult for a ${difficulty} interview level.`;

    const result = await generateText({
      model,
      prompt: `${systemPrompt}\n\nYou MUST respond with a raw JSON object containing a "questions" array. Do NOT wrap it in markdown code blocks. Do not add any conversational text.
Example format:
{
  "questions": [
    {
      "text": "Question text here (for Coding rounds, include full problem statement and examples)",
      "expectedAnswerContext": "Expected private answer or evaluation rubric",
      "type": "spoken" // Use "coding" for coding/DSA problems, "spoken" for others
    }
  ]
}`,
      temperature: 0.7,
    });

    let object;
    try {
      const text = result.text.replace(/```json\n?|\n?```/g, '').trim();
      object = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON", result.text);
      throw new Error("Failed to generate valid JSON");
    }

    return NextResponse.json(object);
  } catch (error: any) {
    console.error('Error generating questions:', error);
    
    // Provide a documented fallback question bank if AI fails
    const roundType = reqBody.roundType || 'Technical';
    const count = reqBody.questionCount || 3;
    
    const fallbackBank: Record<string, any[]> = {
      Technical: [
        { text: "Can you explain the difference between processes and threads?", expectedAnswerContext: "A process is an isolated execution environment, while a thread is the smallest unit of execution within a process sharing memory.", type: "spoken", isFallback: true },
        { text: "What are the core principles of RESTful APIs?", expectedAnswerContext: "Statelessness, client-server architecture, cacheability, uniform interface, layered system.", type: "spoken", isFallback: true },
        { text: "Explain how a hash table works and its time complexity.", expectedAnswerContext: "Uses a hash function to map keys to buckets. O(1) average time complexity for lookups, insertions, and deletions.", type: "spoken", isFallback: true },
        { text: "What is dependency injection and why is it useful?", expectedAnswerContext: "A design pattern where an object receives its dependencies from outside rather than creating them, improving testability and decoupling.", type: "spoken", isFallback: true },
        { text: "How do you handle database migrations in a production environment?", expectedAnswerContext: "Using version control for schema changes, testing locally, applying them in CI/CD, and avoiding destructive changes.", type: "spoken", isFallback: true },
        { text: "Explain the CAP theorem.", expectedAnswerContext: "A distributed system can deliver only two of three desired characteristics: Consistency, Availability, and Partition tolerance.", type: "spoken", isFallback: true },
        { text: "What is the difference between SQL and NoSQL databases?", expectedAnswerContext: "SQL is relational, structured, schema-based. NoSQL is non-relational, document/key-value based, flexible schema.", type: "spoken", isFallback: true },
        { text: "Describe a time you had to optimize a slow-performing query or application.", expectedAnswerContext: "Looking for profiling, adding indexes, caching, n+1 queries optimization, or algorithmic improvements.", type: "spoken", isFallback: true },
        { text: "What are microservices and how do they differ from a monolithic architecture?", expectedAnswerContext: "Microservices break an app into independent, loosely coupled services communicating via APIs, unlike a single cohesive monolith.", type: "spoken", isFallback: true },
        { text: "Explain the concept of 'Eventual Consistency'.", expectedAnswerContext: "A guarantee that if no new updates are made to a given data item, eventually all accesses will return the last updated value.", type: "spoken", isFallback: true }
      ],
      Coding: [
        { text: "Write a function to reverse a string in-place.", expectedAnswerContext: "Use a two-pointer approach swapping characters from the ends towards the center. O(N) time, O(1) space.", type: "coding", isFallback: true },
        { text: "Implement an algorithm to find the nth Fibonacci number.", expectedAnswerContext: "Can be done recursively (O(2^n)), with memoization (O(n)), or iteratively (O(n) time, O(1) space).", type: "coding", isFallback: true },
        { text: "Write a function to detect a cycle in a linked list.", expectedAnswerContext: "Floyd's Tortoise and Hare algorithm. Two pointers moving at different speeds. O(N) time, O(1) space.", type: "coding", isFallback: true },
        { text: "Find the maximum subarray sum (Kadane's Algorithm).", expectedAnswerContext: "Iterate through the array, keeping track of the current subarray sum and the global maximum sum. O(N) time.", type: "coding", isFallback: true }
      ],
      HR: [
        { text: "Tell me about a time you faced a significant technical challenge and how you overcame it.", expectedAnswerContext: "Looking for problem-solving skills, resilience, and clear communication of the situation, task, action, and result (STAR).", type: "spoken", isFallback: true },
        { text: "How do you handle disagreements with colleagues regarding technical decisions?", expectedAnswerContext: "Looking for collaboration, empathy, data-driven reasoning, and compromise.", type: "spoken", isFallback: true },
        { text: "Where do you see yourself in 5 years?", expectedAnswerContext: "Looking for ambition, alignment with company goals, and self-awareness.", type: "spoken", isFallback: true }
      ]
    };
    
    const bank = fallbackBank[roundType] || fallbackBank.Technical;
    
    // Only use fallback if it exists and is appropriate.
    if (bank && bank.length >= count) {
       console.log('Using fallback question bank due to AI provider failure.');
       return NextResponse.json({ questions: bank.slice(0, count) });
    }

    return NextResponse.json({ error: "AI Question Generation Failed and no suitable fallback bank is available: " + error.message }, { status: 500 });
  }
}
