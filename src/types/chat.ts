// types/chat.ts
import { ModelOption } from '@/components/ModelSelector';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type: 'text' | 'audio' | 'image';
  timestamp: string;
  metadata?: {
    model?: string;
    provider?: string;
    processingTime?: number;
    searchContext?: string;
  };
}

export interface ChatState {
  messages: Message[];
  context: string;
  sessionId: string;
  isLoading: boolean;
  error?: string;
}