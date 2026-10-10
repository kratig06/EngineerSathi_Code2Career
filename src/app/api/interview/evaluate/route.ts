import { generateText } from 'ai';
import { getProvider } from '@/lib/ai-provider';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let reqBody: any = {};
  try {
    reqBody = await req.json();
    const { question, candidateAnswer, expectedAnswerContext, isCode, conversationHistory, interviewType, targetRole, followUpCount, timeRemaining } = reqBody;

    const { model } = getProvider();
    
    // Hard limit on follow-ups to keep the interview moving
    const maxFollowUps = 2;
    const canFollowUp = followUpCount < maxFollowUps && timeRemaining > 120; // Need at least 2 mins left to ask a follow up

    const systemPrompt = `You are an expert ${interviewType || 'technical'} interviewer evaluating a candidate for the role of "${targetRole || 'Software Engineer'}".
You are currently engaged in a dynamic cross-questioning flow.

Current Question: "${question}"
Expected Context/Criteria: "${expectedAnswerContext || 'N/A'}"
Candidate Answer: "${candidateAnswer}"
Is this a Code Submission?: ${isCode ? 'Yes' : 'No'}

Conversation History (Context):
${conversationHistory ? conversationHistory : 'No prior history for this question.'}

Your task is to evaluate the candidate's answer and decide on the next action.
You must choose ONE of the following decisions:
1. "FOLLOW_UP": Ask one focused question that explores a gap, validates an unsupported claim, or tests deeper understanding based on their specific answer.
2. "NEXT_QUESTION": Move to the next planned question if the answer is sufficient, correct, or if further probing adds little value.
3. "CLARIFY": Ask for clarification if the answer is genuinely ambiguous or impossible to evaluate.

Rules for Follow-Ups:
- ONLY ask a follow-up if it is genuinely useful to probe their reasoning or validate their claims. Do not ask just because the answer is short.
- Be conversational and professional.
- Do not repeat questions already answered in the history.
- If code is submitted, probe their approach or complexity. If code fails or is incomplete, identify the failure and ask them to reason about it.

CRITICAL: You are allowed to ask a follow-up ONLY IF Can Follow Up is TRUE.
Can Follow Up: ${canFollowUp ? 'TRUE' : 'FALSE'} (If FALSE, you MUST choose NEXT_QUESTION or CLARIFY, but you CANNOT ask a new FOLLOW_UP).

Evaluate the answer and provide:
- score: out of 100 based on accuracy and completeness (null if CLARIFY).
- feedback: brief hidden feedback on the reasoning and gaps.
- decision: "FOLLOW_UP", "NEXT_QUESTION", or "CLARIFY"
- interviewerResponse: What the interviewer should say next. 
  - If FOLLOW_UP, briefly acknowledge their point and ask the follow-up question.
  - If NEXT_QUESTION, briefly acknowledge/evaluate their answer and say you're ready to move on.
  - If CLARIFY, explain what was unclear.
  - NEVER announce "I have selected FOLLOW_UP". Speak naturally.

Return a raw JSON object containing "score", "feedback", "decision", and "interviewerResponse". Do NOT wrap it in markdown code blocks.
Example format:
{
  "score": 85,
  "feedback": "Good explanation of arrays, but didn't address insertion time complexity.",
  "decision": "FOLLOW_UP",
  "interviewerResponse": "You mentioned arrays are faster for access. How does that compare when you need to insert an element in the middle of the collection?"
}`;

    const result = await generateText({
      model,
      prompt: systemPrompt,
      temperature: 0.3,
    });

    let object;
    try {
      const text = result.text.replace(/```json\n?|\n?```/g, '').trim();
      object = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON in evaluation", result.text);
      throw new Error("Failed to generate valid evaluation JSON");
    }
    
    // Enforce limits just in case the model hallucinates
    if (object.decision === 'FOLLOW_UP' && !canFollowUp) {
       object.decision = 'NEXT_QUESTION';
       object.interviewerResponse = "Good points. Given the time, let's move on to the next question.";
    }

    return NextResponse.json(object);
  } catch (error: any) {
    console.error('Error evaluating answer:', error);
    
    // Provide a documented fallback evaluation if AI fails
    console.log('Using fallback evaluation due to AI provider failure.');
    
    return NextResponse.json({
      score: null,
      feedback: "Evaluation unavailable (AI service error). Your answer was recorded.",
      decision: "NEXT_QUESTION",
      interviewerResponse: "Thanks for your answer. Let's move on."
    });
  }
}
