// src/models/chat.model.ts
import { Document } from 'mongodb';

export interface ChatHistory extends Document {
  id: string; // default session ID or specific session
  messages: { role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date }[];
  updatedAt: Date;
}
