// components/AIChatBot/ModelSelector.tsx
'use client'

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

interface ModelSelectorProps {
  selectedModel: ModelOption;
  onModelChange: (model: ModelOption) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  return (
    <div className="w-full space-y-2">
      <select
        value={selectedModel.id}
        onChange={(e) => {
          const model = AI_MODELS.find(m => m.id === e.target.value);
          if (model) onModelChange(model);
        }}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {AI_MODELS.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} - {model.description}
          </option>
        ))}
      </select>
    </div>
  );
}