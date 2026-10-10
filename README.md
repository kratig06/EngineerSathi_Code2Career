# Engineer Sathi

> **Don't just practise answers. Learn to defend them.**

AI-powered, company- and role-specific interview preparation and resume improvement for students.

**Hackathon:** Open Innovation, Problem Statement 4 (Student Pain Points)
**Team:** CodeGravity: Karan Singh, Kratika Gupta
**Status:** [Prototype / In development — update]
**Live demo:** [insert link]  |  **Demo video:** [insert link]

---

## The Problem

Students can find interview questions and resume builders, but may still struggle to:

- **Defend their resume:** explain the projects, skills and numbers they list when interviewers ask follow-ups.
- **Practise realistically:** generic questions rarely match the target company, role or interview round.
- **Act on feedback:** scores and sample answers don't show what *this* student needs to improve.

> These are our starting hypotheses. Validated findings from student surveys and interviews are listed under [Validation](#validation).

## The Solution

Engineer Sathi connects what students **claim on their resume** with what they can **actually explain in an interview**, then turns the result into a personal improvement plan.

```
Upload Resume → Select Company & Role → Generate Interview → Attempt Rounds
      ↑                                                            ↓
  Practise Again ← Improve Resume & Skills ← Performance Report ←──┘
```

## Core Features

| # | Feature | What it does |
|---|---------|--------------|
| 1 | **Profile & Performance Analytics** | One dashboard with your stats, scores and detailed report analysis. |
| 2 | **Company-Based Resume Builder** | Tailors your resume to each target company and role. |
| 3 | **Generic & Custom Interviews** | Quick auto-generated mocks, or personalised rounds, question counts, timers and elimination rules. |
| 4 | **AI Roadmap Made for You** | A study plan built around your goals, skills and target roles. |
| 5 | **Interview Calendar + Prep Plan** | Tracks upcoming company interviews, each with a roadmap to fix weak points before the day. |

### Hero feature: Resume Cross-Examination

The AI reads claims from your actual resume and asks follow-up questions about them.

> Resume claim: *"Developed a machine learning model with 95% accuracy."*
> Follow-ups: Which dataset? How did you split train/test data? Why this metric? How did you check for overfitting or data leakage? What are the model's limitations?

A weak answer does **not** prove a claim false. It flags a claim that needs clarification, evidence or a stronger explanation. Recommendations never invent achievements.

### Interview modes

- **Generic mode:** pick company and role, upload a resume, get a full interview with sensible defaults.
- **Custom mode:** choose rounds, questions per round, time limits, elimination or non-elimination, and the passing threshold.

Example rounds: Aptitude & Fundamentals → Role-Specific Technical → Project Defence → HR & Behavioural.

- **Elimination mode:** you must meet the pass mark to reach the next round.
- **Non-elimination mode:** you complete every round regardless of score.

## Implementation Status

| Feature | Status |
|---------|--------|
| [Feature] | [Implemented / In development / Planned] |
| [Feature] | [Implemented / In development / Planned] |

> Fill this in honestly. Mockups are never presented as working software.

## Validation

- Students surveyed: **[N]**
- Students interviewed: **[N]**
- Struggle to explain resume projects: **[%]**
- Want company- and role-specific mocks: **[%]**
- Want actionable, personalised feedback: **[%]**
- Interested in trying Engineer Sathi: **[N]**

*Source: Engineer Sathi student survey / interviews, [date], [sample size]. Evidence repository: [link].*

## Differentiation

Existing tools (question banks, general AI assistants, resume analysers, mock-interview platforms) each cover part of preparation. Engineer Sathi focuses on the connected loop: resume claims → targeted follow-ups → multi-round simulation → feedback tied back to resume and skills. Capabilities vary by product and plan; [verify named competitors].

## Tech Stack

[Frontend: …] · [Backend: …] · [AI / LLM: …] · [Database: …] · [Hosting: …]

## Getting Started

```bash
# 1. Clone the repository
git clone [repo-url]
cd [repo-folder]

# 2. Install dependencies
[install command]

# 3. Configure environment variables
cp .env.example .env
# add your keys, e.g. [API_KEY_NAME]

# 4. Run the app
[run command]
```

## Usage

1. Upload your resume.
2. Choose a company and target role.
3. Pick Generic or Custom interview mode.
4. Complete the rounds and answer resume-specific follow-ups.
5. Review your report, roadmap & resume recommendations.
6. Add upcoming interviews to the calendar and practise again.

## Adoption Plan (planned)

- Pilot with students in college placement groups.
- Recruit early testers through student communities.
- Offer a simple first interview experience.
- Collect feedback after every session.
- Improve question and feedback quality from test results.
- Expand to more colleges and roles after validation.

## Team

| Name | Role |
|------|------|
| Karan Singh | [role] |
| Kratika Gupta | [role] |

**Institution:** [name]  ·  **Hackathon:** [name]

## License

[Add license, e.g. MIT]
