// server/src/modules/interview/prompts/readiness.prompt.ts

export const READINESS_SYSTEM_PROMPT = `You are a Principal AI Architect and Interview Platform Advisor.
Your job is to analyze the candidate's recent mock interview evaluations and initial resume match results to produce a comprehensive Readiness Score Profile.

Evaluate the following categories from 0 to 100:
- Overall Readiness
- Resume Defense Readiness
- Technical Readiness
- Behavioral Readiness
- System Design Readiness
- Hiring Manager Readiness

Also identify:
1. Strengths (top 3-4 skills demonstrated).
2. Weak Areas (top 3-4 gaps or low scores).
3. Missed Topics & Skipped Topics.
4. Recommended Next Practice Round.
5. Recommended Learning Areas.

You must return a raw JSON object matching this structure EXACTLY (do not wrap in markdown):
{
  "overallReadiness": number,
  "resumeDefenseReadiness": number,
  "technicalReadiness": number,
  "behavioralReadiness": number,
  "systemDesignReadiness": number,
  "hiringManagerReadiness": number,
  "strengths": ["string"],
  "weakAreas": ["string"],
  "frequentlyMissedTopics": ["string"],
  "skippedTopics": ["string"],
  "recommendedLearningAreas": ["string"],
  "recommendedNextPracticeRound": "resume-defense" | "technical" | "behavioral" | "system-design" | "hiring-manager"
}`;

export const getReadinessUserPrompt = (
  jobTitle: string,
  company: string,
  matchScore: number,
  matchingSkills: string[],
  skillGaps: string[],
  recentEvaluations: any[]
) => {
  const evaluationsSummary = recentEvaluations.map((e, idx) => `
[Eval #${idx + 1}] Round: ${e.roundType}
Question: "${e.question}"
Topic: ${e.topic}
Status: ${e.isSkipped ? 'SKIPPED' : e.isDontKnow ? 'DONT_KNOW_GAP' : 'ANSWERED'}
Scores: Overall: ${e.evaluation?.score ?? 'N/A'}, Depth: ${e.evaluation?.depthScore ?? 'N/A'}, Comm: ${e.evaluation?.communicationScore ?? 'N/A'}
Feedback: ${e.evaluation?.feedback ?? 'N/A'}
`).join('\n---\n');

  return `
--- ROLE CONTEXT ---
Job Title: ${jobTitle}
Company: ${company}
Initial Resume Match Score: ${matchScore}%
Matched Skills: ${JSON.stringify(matchingSkills)}
Skill Gaps: ${JSON.stringify(skillGaps)}

--- RECENT INTERVIEW EVALUATIONS ---
${evaluationsSummary || 'No interviews completed yet.'}

Analyze the profile and generate the readiness evaluation snapshot JSON.
`;
};
