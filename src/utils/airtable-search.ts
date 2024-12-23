// src/utils/airtable-search.ts
import { AIRTABLE_CONFIG as CONFIG } from '../config/airtable';
import Airtable from 'airtable';

export class AirtableSearchService {
  private base: any;

  constructor() {
    this.base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(CONFIG.BASE_ID!);
  }

  async processQuery(query: string, filters?: SearchFilters) {
    const queryLower = query.toLowerCase();
    
    // Procesar consultas específicas
    if (queryLower.includes('id')) {
      const idMatch = query.match(/id\s*(\d+)/i);
      if (idMatch) {
        return await this.findById(idMatch[1]);
      }
    }

    if (queryLower.includes('último') || queryLower.includes('ultima')) {
      const typeMatch = /(imagen|audio|documento|text)/i.exec(query);
      if (typeMatch) {
        return await this.getLatestByType(typeMatch[1]);
      }
    }

    if (queryLower.includes('todas las imagenes')) {
      return await this.getAllByType('image');
    }

    if (queryLower.includes('mencionado') || queryLower.includes('menciona')) {
      const nameMatch = query.match(/(?:esta\s+)?([A-Za-zÁ-úñÑ]+)\s+(?:esta\s+)?menciona/i);
      if (nameMatch) {
        return await this.findMentions(nameMatch[1]);
      }
    }

    // Búsqueda general si no hay consultas específicas
    return await this.searchRecords(query, filters);
  }

  private async findById(id: string) {
    const records = await this.base(CONFIG.TABLE_ID)
      .select({
        filterByFormula: `{${CONFIG.FIELDS.ID}} = '${id}'`
      })
      .all();

    return records.map(record => this.formatRecord(record));
  }

  async getAllByType(type: string) {
    const typeValues = CONFIG.TYPE_MAPPING[type];
    if (!typeValues) return [];

    const records = await this.base(CONFIG.TABLE_ID)
      .select({
        filterByFormula: `OR(${typeValues.map(value => 
          `{${CONFIG.FIELDS.SOURCE_TYPE}} = '${value}'`
        ).join(', ')})`,
        sort: [{ field: CONFIG.FIELDS.TIMESTAMP, direction: 'desc' }]
      })
      .all();

    return records.map(record => this.formatRecord(record));
  }

  async getLatestByType(type: string) {
    const typeValues = CONFIG.TYPE_MAPPING[type.toLowerCase()];
    if (!typeValues) return [];

    const records = await this.base(CONFIG.TABLE_ID)
      .select({
        maxRecords: 1,
        sort: [{ field: CONFIG.FIELDS.TIMESTAMP, direction: 'desc' }],
        filterByFormula: `OR(${typeValues.map(value => 
          `{${CONFIG.FIELDS.SOURCE_TYPE}} = '${value}'`
        ).join(', ')})`
      })
      .all();

    return records.map(record => this.formatRecord(record));
  }

  async findMentions(name: string) {
    const records = await this.base(CONFIG.TABLE_ID)
      .select({
        filterByFormula: `SEARCH('${name}', {${CONFIG.FIELDS.CONTENT}})`,
        sort: [{ field: CONFIG.FIELDS.TIMESTAMP, direction: 'desc' }]
      })
      .all();

    return records.map(record => this.formatRecord(record));
  }

  async searchRecords(query: string, filters?: SearchFilters) {
    try {
      let filterFormulas = [];

      // Búsqueda en contenido
      if (query) {
        filterFormulas.push(
          `SEARCH("${query.toLowerCase()}", LOWER({${CONFIG.FIELDS.CONTENT}}))`
        );
      }

      // Aplicar filtros adicionales
      if (filters) {
        this.applyFilters(filterFormulas, filters);
      }

      const finalFormula = filterFormulas.length > 0
        ? `AND(${filterFormulas.join(', ')})`
        : '';

      const records = await this.base(CONFIG.TABLE_ID)
        .select({
          maxRecords: filters?.limit || 10,
          sort: [{ field: CONFIG.FIELDS.TIMESTAMP, direction: filters?.order || 'desc' }],
          filterByFormula: finalFormula
        })
        .all();

      return records.map(record => this.formatRecord(record));
    } catch (error) {
      console.error('Error en búsqueda Airtable:', error);
      return [];
    }
  }

  private applyFilters(filterFormulas: string[], filters: SearchFilters) {
    if (filters.type) {
      const typeValues = CONFIG.TYPE_MAPPING[filters.type];
      if (typeValues) {
        filterFormulas.push(
          `OR(${typeValues.map(value => 
            `{${CONFIG.FIELDS.SOURCE_TYPE}} = '${value}'`
          ).join(', ')})`
        );
      }
    }

    if (filters.sentiment) {
      filterFormulas.push(`{${CONFIG.FIELDS.SENTIMENT}} = '${filters.sentiment}'`);
    }

    if (filters.language) {
      filterFormulas.push(`{${CONFIG.FIELDS.LANGUAGE}} = '${filters.language}'`);
    }

    if (filters.topic) {
      filterFormulas.push(`{${CONFIG.FIELDS.TOPIC}} = '${filters.topic}'`);
    }

    if (filters.dateRange) {
      filterFormulas.push(
        `AND(
          IS_AFTER({${CONFIG.FIELDS.TIMESTAMP}}, '${filters.dateRange.start}'),
          IS_BEFORE({${CONFIG.FIELDS.TIMESTAMP}}, '${filters.dateRange.end}')
        )`
      );
    }
  }

  private formatRecord(record: any) {
    return {
      id: record.id,
      recordId: record.get(CONFIG.FIELDS.ID),
      timestamp: record.get(CONFIG.FIELDS.TIMESTAMP),
      type: record.get(CONFIG.FIELDS.TYPE),
      content: record.get(CONFIG.FIELDS.CONTENT),
      sourceType: record.get(CONFIG.FIELDS.SOURCE_TYPE),
      classification: record.get(CONFIG.FIELDS.CLASSIFICATION),
      sentiment: record.get(CONFIG.FIELDS.SENTIMENT),
      language: record.get(CONFIG.FIELDS.LANGUAGE),
      topic: record.get(CONFIG.FIELDS.TOPIC),
      keywords: record.get(CONFIG.FIELDS.KEYWORDS),
      metadata: record.get(CONFIG.FIELDS.METADATA)
    };
  }
}

interface SearchFilters {
  type?: string;
  sentiment?: string;
  language?: string;
  topic?: string;
  limit?: number;
  order?: 'asc' | 'desc';
  dateRange?: {
    start: string;
    end: string;
  };
}

// src/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AirtableSearchService } from '@/utils/airtable-search';

// Inicializar servicios
const searchService = new AirtableSearchService();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);

const systemPrompt = `
Eres un asistente experto en analizar y relacionar información de una base de datos multimodal.
Tu trabajo es ayudar a encontrar y relacionar información relevante en la base de datos.

Cuando analices la información:
1. Identifica referencias a personas, lugares, fechas o eventos específicos
2. Relaciona información entre diferentes tipos de contenido (imágenes, audio, documentos)
3. Considera el contexto temporal y las relaciones entre eventos
4. Identifica patrones y temas recurrentes
5. Analiza el sentimiento y contexto de las conversaciones

Base de datos actual contiene:
- Imágenes con descripciones y análisis
- Grabaciones de audio con transcripciones
- Documentos y textos
- Metadatos como fechas, temas y sentimientos

Al responder:
1. Primero responde directamente a la pregunta usando la información disponible
2. Menciona explícitamente las fuentes y fechas de la información
3. Sugiere conexiones relevantes con otros contenidos en la base de datos
4. Si la información es incompleta o ambigua, indícalo y sugiere búsquedas adicionales

Contexto actual: {contextoPrevio}
`;

export async function POST(req: NextRequest) {
  try {
    const { message, context, model, filters } = await req.json();

    // Usar el método processQuery mejorado
    const searchResults = await searchService.processQuery(message, filters);

    // Si no hay resultados, proporcionar una respuesta apropiada
    if (searchResults.length === 0) {
      return NextResponse.json({
        message: "No encontré información que coincida con tu búsqueda. ¿Podrías reformular tu pregunta o proporcionar más detalles?",
        analysis: true,
        searchResults: [],
        metadata: {
          model: model?.id || 'gpt-4',
          provider: model?.provider || 'openai',
          timestamp: new Date().toISOString(),
          resultsFound: 0
        }
      });
    }
    
    // Preparar el contexto para el modelo de lenguaje
    const contextWithResults = `
      Consulta del usuario: "${message}"
      
      Resultados encontrados en la base de datos:
      ${searchResults.map(result => `
        - Tipo: ${result.type}
        - Contenido: ${result.content}
        - Fecha: ${result.timestamp}
        - Tema: ${result.topic || 'No especificado'}
        - Sentimiento: ${result.sentiment || 'No especificado'}
      `).join('\n')}
      
      Contexto previo: ${context || 'No hay contexto previo'}
    `;

    // Procesar con el modelo de lenguaje seleccionado
    let response;
    switch (model?.provider || 'openai') {
      case 'openai':
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt.replace('{contextoPrevio}', context || '') },
            { role: "user", content: contextWithResults }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });
        response = completion.choices[0].message.content;
        break;

      case 'anthropic':
        const anthropicMsg = await anthropic.messages.create({
          model: model.id,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: contextWithResults
          }],
          system: systemPrompt.replace('{contextoPrevio}', context || '')
        });
        response = anthropicMsg.content[0].text;
        break;

      case 'gemini':
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await geminiModel.generateContent([
          { text: systemPrompt.replace('{contextoPrevio}', context || '') },
          { text: contextWithResults }
        ]);
        const geminiResponse = await result.response;
        response = await geminiResponse.text();
        break;

      default:
        throw new Error(`Proveedor no soportado: ${model?.provider}`);
    }

    return NextResponse.json({ 
      message: response,
      analysis: true,
      searchResults,
      metadata: {
        model: model?.id || 'gpt-4',
        provider: model?.provider || 'openai',
        timestamp: new Date().toISOString(),
        resultsFound: searchResults.length
      }
    });

  } catch (error) {
    console.error('Error en chat:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error procesando el mensaje',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}