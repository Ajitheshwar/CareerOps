// server/src/modules/interview/prompts/next-question.prompt.ts

export const NEXT_QUESTION_SYSTEM_PROMPT = `You are a dynamic, conversational AI Interviewer.
Your job is to generate the NEXT question for an active round.
You MUST NOT output static or pre-arranged lists of questions.
Your generated question must adapt to:
1. Candidate's answer performance (evaluations) and knowledge gaps.
2. Ratings from candidate (e.g. if candidate rated previous question confusing or hard).
3. The difficulty target modifier (Easy, Medium, Hard) and target zone (Productive Challenge).
4. Direct manual overrides (e.g., if candidate requested an easier/harder question, you MUST adjust immediately).
5. "I Don't Know" flags: If the user flagged a knowledge gap, lower difficulty slightly, cover foundational elements, and plan to revisit later.
6. Skip flags: If the user skipped, pick a related or next logical topic, and address the gap constructively.

You must output a raw JSON object matching this structure EXACTLY (do not wrap in markdown):
{
  "question": "string", // The next adapted question.
  "tips": "string", // Practical tip or strategy to answer this specific question.
  "hint": "string", // A minor guide or query clue (e.g. "Think about initial values") without giving away the full answer.
  "answerTemplate": "string", // The hidden ideal model answer/template for this question (to reveal to user after they answer/skip).
  "topic": "string" // The specific topic this question covers (must match one of the round's topics).
}`;

export const getNextQuestionUserPrompt = (
  resumeText: string,
  jobDesc: string,
  company: string,
  roundType: string,
  config: any,
  goals: string[],
  uncoveredTopics: string[],
  coveredTopics: string[],
  history: any[]
) => {
  const historyText = history.map((h, i) => {
    let detail = `[Q${i + 1}] Topic: ${h.topic}
Question: "${h.question}"
`;
    if (h.isSkipped) {
      detail += `Status: SKIPPED BY USER.
`;
    } else if (h.isDontKnow) {
      detail += `Status: USER INDICATED KNOWLEDGE GAP (I Don't Know).
`;
    } else {
      detail += `User Answer: "${h.userAnswer || 'N/A'}"
`;
      if (h.evaluation) {
        detail += `Grade: ${h.evaluation.score}/100.
Depth Score: ${h.evaluation.depthScore || 'N/A'}, Communication: ${h.evaluation.communicationScore || 'N/A'}, Problem Solving: ${h.evaluation.problemSolvingScore || 'N/A'}.
Critique: ${h.evaluation.feedback}
`;
      }
    }
    
    if (h.feedback) {
      detail += `User Feedback Ratings: Difficulty Rating: ${h.feedback.difficultyRating || 'N/A'}, Clarity: ${h.feedback.clarityRating || 'N/A'}, Confidence Before: ${h.feedback.confidenceBefore || 'N/A'}, Confidence After: ${h.feedback.confidenceAfter || 'N/A'}
`;
    }
    
    if (h.requestEasier) {
      detail += `User Action: Requested a SIMPLER/EASIER follow-up.
`;
    } else if (h.requestHarder) {
      detail += `User Action: Requested a MORE CHALLENGING/HARDER follow-up.
`;
    }
    
    return detail;
  }).join('\n---\n');

  return `
--- CONTEXT ---
Role/Company: ${config.jobTitle || 'Role'} at ${company}
Target Job Requirements: ${jobDesc}
Candidate Resume Profile: ${resumeText}

--- ROUND DETAILS ---
Active Round: ${roundType}
Difficulty Mode: ${config.difficulty} (Range: beginner/intermediate/advanced)
Selected focus areas: ${JSON.stringify(config.focus)}
Round Objectives/Goals: ${JSON.stringify(goals)}
Remaining/Uncovered Topics: ${JSON.stringify(uncoveredTopics)}
Covered Topics: ${JSON.stringify(coveredTopics)}

--- INTERVIEW LOG & HISTORY ---
${historyText || 'No questions answered yet. This is Question 1.'}

Generate the adapted next question JSON according to the system specifications.
`;
};
