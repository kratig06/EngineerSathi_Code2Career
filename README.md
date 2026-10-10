# Engineer Saathi

An AI-powered mock interview experience for software engineering candidates.

## Features

- **Personalized Interviews**: Tailored to target company, role, technical domain, and resume.
- **Live AI Interviewer**: Animated avatar with natural voice interactions and distinct states.
- **Adaptive Questions**: Follow-up questions based on the candidate's actual answers.
- **Integrated Coding Workspace**: Real-time coding editor for technical challenges.
- **Code Explanation**: AI challenges your specific implementation and design choices.
- **Post-Interview Report**: Detailed, evidence-based performance report with an actionable improvement plan.
- **Optional Camera Environment Check**: Consent-based environment and attention signaling.

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add your API keys:
   ```bash
   cp .env.example .env.local
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **UI Components**: Radix UI primitives, Lucide Icons, Framer Motion
- **State Management**: Zustand
- **Code Editor**: Monaco Editor
- **Charts**: Recharts

## Environment Variables

- `AI_PROVIDER`: The primary AI provider to use (default: `gemini`)
- `GEMINI_API_KEY`: API key for Google Gemini
- `GROQ_API_KEY`: API key for Groq (optional secondary provider)
- `CODE_EXECUTION_API_KEY`: API key for secure sandbox code execution (e.g., Judge0)
