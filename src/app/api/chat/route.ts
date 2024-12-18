// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

async function processOpenAI(message: string, context: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are an AI assistant with access to a database of multimodal content. 
                 Use the following context when relevant: ${context}`
      },
      { role: "user", content: message }
    ]
  });
  return completion.choices[0].message.content;
}

async function processAnthropic(message: string, context: string, modelId: string) {
  const message = await anthropic.messages.create({
    model: modelId,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: message
    }],
    system: `You are an AI assistant with access to a database of multimodal content. 
             Use the following context when relevant: ${context}`
  });
  return message.content[0].text;
}

async function processGemini(message: string, context: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(message);
  const response = await result.response;
  return response.text();
}

export async function POST(req: NextRequest) {
  try {
    const { message, context, model } = await req.json();
    let response;

    switch (model.provider) {
      case 'openai':
        response = await processOpenAI(message, context);
        break;
      case 'anthropic':
        response = await processAnthropic(message, context, model.id);
        break;
      case 'gemini':
        response = await processGemini(message, context);
        break;
      default:
        throw new Error('Invalid model provider');
    }

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}