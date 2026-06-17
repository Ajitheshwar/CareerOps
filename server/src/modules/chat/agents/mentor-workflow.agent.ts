import { StateGraph, Annotation } from "@langchain/langgraph";
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { LLMService } from "../../../shared/llm";
import { getCollection, getUserProfile } from "../../../shared/db";

// Define the LangGraph state annotation
export const MentorState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  userId: Annotation<string>(),
  retrievedContext: Annotation<string>(),
});

/**
 * Retrieve hybrid context from MongoDB collections using Atlas Vector Search with a clean fallback.
 */
async function retrieveHybridContext(query: string, llm: LLMService): Promise<string> {
  let context = "";
  try {
    const queryEmbedding = await llm.embedText(query);
    
    // 1. Stored Resume
    const profile = await getUserProfile();
    if (profile) {
      context += `--- USER RESUME PROFILE ---\n${profile.resumeText}\n\n`;
    }

    // 2. Active Job Listings (Vector Search with MQL fallback)
    let listingsContext = "";
    try {
      const col = await getCollection('job_listings');
      const vectorResults = await col.aggregate([
        {
          $vectorSearch: {
            index: "default",
            path: "job_embedding",
            queryVector: queryEmbedding,
            numCandidates: 10,
            limit: 3
          }
        }
      ]).toArray();
      
      if (vectorResults.length > 0) {
        listingsContext = vectorResults.map((j: any) => 
          `- [${j.status.toUpperCase()}] ${j.title} at ${j.company} (Loc: ${j.location})\nDescription: ${j.description}\nRequirements: ${(j.requirements || []).join(', ')}`
        ).join('\n\n');
      }
    } catch (vectorErr) {
      // Fallback: query database normally
      const col = await getCollection('job_listings');
      const standardResults = await col.find({}).limit(5).toArray();
      listingsContext = standardResults.map((j: any) => 
        `- [${j.status.toUpperCase()}] ${j.title} at ${j.company} (Loc: ${j.location})\nDescription: ${j.description}\nRequirements: ${(j.requirements || []).join(', ')}`
      ).join('\n\n');
    }
    
    if (listingsContext) {
      context += `--- ACTIVE JOB TRACKER LISTINGS ---\n${listingsContext}\n\n`;
    }

    // 3. Mock Interview Performance Metrics
    let interviewContext = "";
    try {
      const col = await getCollection('mock_interviews');
      const interviews = await col.find({}).limit(3).toArray();
      if (interviews.length > 0) {
        interviewContext = interviews.map((i: any) => 
          `- Session at ${i.company || 'N/A'} for role ${i.jobTitle || 'N/A'}\nScore: ${i.performanceScore}%\nFeedback: ${(i.feedback || []).join('; ')}\nAction Items: ${(i.actionItems || []).join('; ')}`
        ).join('\n\n');
      }
    } catch (err) {
      // ignore silently
    }
    
    if (interviewContext) {
      context += `--- MOCK INTERVIEW PERFORMANCE METRICS ---\n${interviewContext}\n\n`;
    }

    // 4. Previously Generated Tailored Artifacts (Resumes/Cover Letters)
    let artifactsContext = "";
    try {
      const col = await getCollection('generated_artifacts');
      const artifacts = await col.find({}).limit(3).toArray();
      if (artifacts.length > 0) {
        artifactsContext = artifacts.map((a: any) => 
          `- Tailored Resume & Cover Letter for Job ID ${a.jobId}\nCover Letter: ${a.coverLetter.slice(0, 200)}...`
        ).join('\n\n');
      }
    } catch (err) {
      // ignore silently
    }
    
    if (artifactsContext) {
      context += `--- GENERATED ARTIFACTS HISTORY ---\n${artifactsContext}\n\n`;
    }

  } catch (err) {
    console.error("Hybrid context retrieval error:", err);
  }
  
  return context;
}

// Retrieve Context Node
async function retrieveContextNode(state: typeof MentorState.State) {
  const llm = new LLMService();
  const lastMessage = state.messages[state.messages.length - 1]?.content || "";
  const context = await retrieveHybridContext(String(lastMessage), llm);
  return { retrievedContext: context };
}

// Generate Response Node
async function generateResponseNode(state: typeof MentorState.State) {
  const llm = new LLMService();
  const messages = state.messages;
  
  const systemPrompt = `You are a Senior Full-Stack Career Mentor Agent and executive recruitment coach.
Your goal is to guide candidates strategically:
- Analyze their skills against their active job applications.
- Suggest concrete engineering project improvements to address gaps.
- Provide step-by-step guidance on answering interview questions based on their feedback records.
- Synthesize previously generated materials (like tailored resume bullets or cover letters) to help them prepare cold emails or custom introductions.

Write in a direct, professional, encouraging tone. Highlight key recommendations in bullet points or code-like structured boxes.

Here is the retrieved context from their active workspace:
${state.retrievedContext}
`;

  const userQuery = messages[messages.length - 1]?.content || "Hello";
  const assistantResponse = await llm.generateText(String(userQuery), systemPrompt);
  
  return {
    messages: [new AIMessage(assistantResponse)]
  };
}

// Build stateful graph workflow
const workflow = new StateGraph(MentorState)
  .addNode("retrieveContext", retrieveContextNode)
  .addNode("generateResponse", generateResponseNode)
  .addEdge("__start__", "retrieveContext")
  .addEdge("retrieveContext", "generateResponse")
  .addEdge("generateResponse", "__end__");

export const mentorWorkflow = workflow.compile();
