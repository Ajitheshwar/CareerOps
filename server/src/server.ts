import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { AgentOrchestrator } from './agents/orchestrator';
import { LLMService } from './llm';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const orchestrator = new AgentOrchestrator();

// Store active SSE clients
let sseClients: any[] = [];

// Register orchestrator listeners to stream updates to clients
orchestrator.registerListener((state) => {
  sendSSEEvent('state', state);
});

orchestrator.registerLogListener((log) => {
  sendSSEEvent('log', log);
});

function sendSSEEvent(type: string, data: any) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch (err) {
      // client connection probably closed
    }
  });
}

// REST API Endpoints
app.get('/api/state', (req, res) => {
  res.json(orchestrator.getState());
});

app.post('/api/reset', (req, res) => {
  orchestrator.resetState();
  res.json({ success: true, message: 'State reset successfully.' });
});

app.post('/api/search', async (req, res) => {
  const { resumeText, jobQuery, location } = req.body;
  
  if (!resumeText || !jobQuery) {
    return res.status(400).json({ error: 'resumeText and jobQuery are required.' });
  }

  // Run in background so request resolves immediately, updates will stream via SSE
  orchestrator.runJobSearchAndMatch(resumeText, jobQuery, location || 'Remote')
    .catch(err => console.error('Error in search pipeline:', err));

  res.json({ success: true, message: 'Job search and matching pipeline started.' });
});

app.post('/api/tailor', (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required.' });
  }

  // Run in background
  orchestrator.runTailoringAndPrep(jobId)
    .catch(err => console.error('Error in tailoring pipeline:', err));

  res.json({ success: true, message: 'Tailoring and interview preparation pipeline started.' });
});

app.post('/api/chat', async (req, res) => {
  const { question, type, userAnswer } = req.body;

  if (!question || !userAnswer) {
    return res.status(400).json({ error: 'question and userAnswer are required.' });
  }

  const llm = new LLMService();
  if (llm.isMock()) {
    // Artificial delay to simulate evaluation
    await new Promise(resolve => setTimeout(resolve, 1500));
    const feedback = `Good attempt! Here is some quick coach advice on how to polish this response:
- Structure: Your answer is ${userAnswer.split(' ').length} words. It covers the core requirements.
- Strengths: You directly addressed the question and showed confidence in the subject matter.
- Improvements: Incorporate stronger action words (e.g. "spearheaded", "engineered"). Try to quantify results where possible (e.g. "improving build efficiency by 25%").
- Framework alignment: When explaining concepts, link them back to reactive architecture or dependency injection for maximum resume weight.`;
    return res.json({ feedback });
  }

  try {
    const systemPrompt = `You are a professional technical interviewer and executive career coach. 
Evaluate the candidate's response to the interview question.
Provide constructive feedback (3-4 bullet points or short paragraphs) detailing:
1. Strengths: What they stated correctly or framed well.
2. Areas of Improvement: Missing elements or weak phrasing.
3. Formatting: Suggesting stronger action verbs and metrics.
Keep the tone encouraging, direct, and professional.`;

    const prompt = `Question: "${question}" (Type: ${type})
Candidate's Response: "${userAnswer}"

Please evaluate this answer and provide actionable feedback.`;

    const feedback = await llm.generateText(prompt, systemPrompt);
    res.json({ feedback });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Server-Sent Events Endpoint
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Establish connection

  // Send initial state immediately
  res.write(`event: state\ndata: ${JSON.stringify(orchestrator.getState())}\n\n`);

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client !== res);
  });
});

// Serve frontend static files if they exist (production build support)
const clientBuildPath = path.join(__dirname, '../../client/dist/client/browser');
app.use(express.static(clientBuildPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('CareerOps API is running. Client build files not found or served.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` CareerOps server listening on http://localhost:${PORT}`);
  console.log(`==================================================`);
});
