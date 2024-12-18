// types/airtable.ts
export type ContentType = 'text' | 'audio' | 'image' | 'document' | 'multimodal';
export type SourceType = 'direct_input' | 'file_upload' | 'voice_recording' | 'image_analysis' | 'document_extraction';
export type SentimentType = 'positive' | 'negative' | 'neutral' | 'mixed';
export type LanguageType = 'español' | 'english' | 'portuguese' | 'other';

export interface AirtableRecord {
  id: string;
  Type: ContentType;
  Content: string;
  Timestamp: string;
  Source_Type: SourceType;
  Classification: string[];
  Sentiment: SentimentType;
  Language: LanguageType;
  Topic: string[];
  Keywords: string[];
  Metadata: string;
  Session_ID: string;
}

export interface SearchResult {
  results: AirtableRecord[];
  context: string;
}

export interface RecordMetadata {
  originalType?: string;
  processingTimestamp?: string;
  mimeType?: string;
  source?: string;
  sessionData?: {
    startTime: string;
    endTime?: string;
    userInfo?: any;
  };
  analysisResults?: {
    confidence?: number;
    processingTime?: number;
    aiModel?: string;
  };
}

export interface SearchOptions {
  query: string;
  sessionId?: string;
  filters?: {
    type?: ContentType[];
    dateRange?: {
      start: string;
      end: string;
    };
    sentiment?: SentimentType[];
    language?: LanguageType[];
  };
  sort?: {
    field: keyof AirtableRecord;
    direction: 'asc' | 'desc';
  };
  limit?: number;
}

// utils/contextManager.ts
import { AirtableRecord, SearchOptions } from '../types/airtable';

export class ContextManager {
  private static readonly SIMILARITY_THRESHOLD = 0.6;
  private static readonly MAX_CONTEXT_ITEMS = 5;

  static buildSearchQuery(options: SearchOptions): string {
    const searchFormulas = [];

    // Búsqueda por contenido
    if (options.query) {
      searchFormulas.push(`SEARCH("${options.query.toLowerCase()}", LOWER({Content}))`);
    }

    // Filtros por tipo
    if (options.filters?.type?.length) {
      const typeFormula = options.filters.type
        .map(type => `{Type} = '${type}'`)
        .join(', ');
      searchFormulas.push(`OR(${typeFormula})`);
    }

    // Filtros por fecha
    if (options.filters?.dateRange) {
      searchFormulas.push(
        `AND(
          IS_AFTER({Timestamp}, '${options.filters.dateRange.start}'),
          IS_BEFORE({Timestamp}, '${options.filters.dateRange.end}')
        )`
      );
    }

    return searchFormulas.length ? `AND(${searchFormulas.join(', ')})` : '';
  }

  static async findRelatedRecords(base: any, record: AirtableRecord): Promise<AirtableRecord[]> {
    const formulas = [];
    
    if (record.Topic?.length) {
      const topicFormula = record.Topic
        .map(topic => `FIND('${topic}', {Topic})`)
        .join(', ');
      formulas.push(`OR(${topicFormula})`);
    }

    if (record.Keywords?.length) {
      const keywordFormula = record.Keywords
        .map(keyword => `FIND('${keyword}', {Keywords})`)
        .join(', ');
      formulas.push(`OR(${keywordFormula})`);
    }

    if (record.Session_ID) {
      formulas.push(`{Session_ID} = '${record.Session_ID}'`);
    }

    if (!formulas.length) return [];

    const records = await base('Content')
      .select({
        filterByFormula: `OR(${formulas.join(', ')})`,
        sort: [{ field: 'Timestamp', direction: 'desc' }],
        maxRecords: this.MAX_CONTEXT_ITEMS
      })
      .all();

    return records.map(r => r._rawJson);
  }

  static async buildResponseContext(
    base: any,
    query: string,
    results: AirtableRecord[]
  ): Promise<string> {
    let context = '';
    
    if (results.length) {
      context += 'Resultados relevantes:\n';
      results.forEach(record => {
        const metadata = JSON.parse(record.Metadata || '{}');
        context += `- ${record.Content.substring(0, 150)}... \n`;
        context += `  (${record.Type}, ${record.Timestamp}, Topics: ${record.Topic.join(', ')})\n`;
        if (metadata.sessionData?.userInfo) {
          context += `  Usuario: ${metadata.sessionData.userInfo}\n`;
        }
      });
    }

    // Buscar información relacionada
    const relatedRecords = new Set<AirtableRecord>();
    for (const record of results.slice(0, 2)) {
      const related = await this.findRelatedRecords(base, record);
      related.forEach(r => relatedRecords.add(r));
    }

    if (relatedRecords.size) {
      context += '\nInformación relacionada:\n';
      relatedRecords.forEach(record => {
        context += `- ${record.Content.substring(0, 100)}... \n`;
        context += `  (${record.Type}, ${record.Timestamp})\n`;
      });
    }

    return context;
  }
}

// app/api/airtable-search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { SearchOptions, SearchResult } from '@/types/airtable';
import { ContextManager } from '@/utils/contextManager';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export async function POST(req: NextRequest) {
  try {
    const searchOptions: SearchOptions = await req.json();
    
    // Construir query
    const searchFormula = ContextManager.buildSearchQuery(searchOptions);
    
    // Buscar registros
    const records = await base('Content')
      .select({
        filterByFormula: searchFormula,
        sort: [{ field: 'Timestamp', direction: 'desc' }],
        maxRecords: searchOptions.limit || 10
      })
      .all();

    // Procesar resultados
    const results = await Promise.all(records.map(async record => {
      const data = record._rawJson;
      const relatedRecords = await ContextManager.findRelatedRecords(base, data);
      return {
        ...data,
        relatedRecords: relatedRecords.slice(0, 3)
      };
    }));

    // Construir contexto
    const context = await ContextManager.buildResponseContext(
      base,
      searchOptions.query,
      results
    );

    const response: SearchResult = { results, context };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Airtable search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Airtable' },
      { status: 500 }
    );
  }
}

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
                 Use this context when relevant:\n${context}\n
                 Always reference the context when answering questions about past interactions or stored content.`
      },
      { role: "user", content: message }
    ]
  });
  return completion.choices[0].message.content;
}

async function processAnthropic(message: string, context: string, modelId: string) {
  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: message
    }],
    system: `You are an AI assistant with access to a database of multimodal content. 
             Use this context when relevant:\n${context}\n
             Always reference the context when answering questions about past interactions or stored content.`
  });
  return response.content[0].text;
}

async function processGemini(message: string, context: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent([
    {
      text: `Context:\n${context}\n\nUser question: ${message}`
    }
  ]);
  const response = await result.response;
  return response.text();
}

export async function POST(req: NextRequest) {
  try {
    const { message, context, model, sessionId } = await req.json();
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