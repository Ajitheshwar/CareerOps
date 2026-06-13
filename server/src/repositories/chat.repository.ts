// src/repositories/chat.repository.ts
import { getCollection, ChatHistory } from '../db';

export class ChatRepository {
  static async saveChatHistory(id: string, messages: ChatHistory['messages']): Promise<void> {
    try {
      const col = await getCollection<ChatHistory>('chat_histories');
      await col.updateOne(
        { id },
        { 
          $set: { 
            messages, 
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );
    } catch (err) {
      console.error(`Failed to save chat history ${id}:`, err);
      throw err;
    }
  }

  static async getChatHistory(id: string): Promise<ChatHistory | null> {
    try {
      const col = await getCollection<ChatHistory>('chat_histories');
      return await col.findOne({ id });
    } catch (err) {
      console.error(`Failed to get chat history ${id}:`, err);
      return null;
    }
  }
}
