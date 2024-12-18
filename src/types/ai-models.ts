// types/ai-models.ts
export type ModelProvider = 'openai' | 'anthropic' | 'gemini';

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  description: string;
}

export const AI_MODELS: ModelOption[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'Most capable OpenAI model for general tasks'
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Most capable Anthropic model for complex tasks'
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    description: 'Balanced Anthropic model for general use'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'gemini',
    description: 'Google\'s advanced language model'
  }
];