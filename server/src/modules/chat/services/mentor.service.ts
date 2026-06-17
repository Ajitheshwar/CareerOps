// src/services/mentor.service.ts
import { ChatRepository } from '../repositories/chat.repository';
import { mentorWorkflow } from '../agents/mentor-workflow.agent';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

export class MentorService {
  static async getChatHistory(userId: string) {
    const history = await ChatRepository.getChatHistory(userId);
    return history ? history.messages : [];
  }

  static async promptMentor(userId: string, message: string) {
    const uid = userId || 'default';
    
    // 1. Fetch chat history from DB
    const history = await ChatRepository.getChatHistory(uid);
    const messages = history ? history.messages : [];

    // 2. Add user message
    messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // 3. Format history messages for LangGraph workflow
    const langGraphMessages = messages.map((m: any) => {
      if (m.role === 'user') return new HumanMessage(m.content);
      return new AIMessage(m.content);
    });

    // 4. Run LangGraph mentor agent workflow
    const result = await mentorWorkflow.invoke({
      messages: langGraphMessages,
      userId: uid,
      retrievedContext: ''
    });

    const botContent = String(result.messages[result.messages.length - 1].content);

    // 5. Add bot response to history
    messages.push({
      role: 'assistant',
      content: botContent,
      timestamp: new Date()
    });

    // 6. Save updated history to DB
    await ChatRepository.saveChatHistory(uid, messages);

    return {
      response: botContent,
      history: messages
    };
  }
}
