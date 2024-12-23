// utils/modelSelector.ts
import { ModelOption, AI_MODELS } from '@/components/ModelSelector';

export function getRandomModel(): ModelOption {
  const randomIndex = Math.floor(Math.random() * AI_MODELS.length);
  return AI_MODELS[randomIndex];
}

export function getModelForMessage(message: string, currentModel?: ModelOption): ModelOption {
  // Usar modelo actual si existe y de manera aleatoria 70% del tiempo
  if (currentModel && Math.random() < 0.7) {
    return currentModel;
  }
  
  // 30% del tiempo, elegir un modelo aleatorio
  return getRandomModel();
}