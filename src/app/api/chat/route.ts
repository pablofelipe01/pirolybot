// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { groupBy } from 'lodash';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appaXFZ4t36G8oW6X';
const AIRTABLE_TABLE_ID = 'tbl9Rl8a2dOm5n66L';

interface AirtableRecord {
  id: string;
  Type: string;
  Content: string;
  Timestamp: string;
  Sentiment: string;
  Keywords: string;
  Language: string;
  Topic: string[];
  Source_Type: string;
  Metadata?: string;
}

function parseMetadata(metadataStr: string) {
  try {
    return JSON.parse(metadataStr);
  } catch (e) {
    return null;
  }
}

function searchRecords(records: AirtableRecord[], query: string) {
  const searchTerms = query.toLowerCase().split(' ');
  
  return records.filter(record => {
    const metadata = record.Metadata ? parseMetadata(record.Metadata) : {};
    const searchableContent = [
      record.Content,
      record.Keywords,
      record.Type,
      record.Language,
      ...record.Topic,
      metadata?.analysis?.description || '',
      metadata?.aiAnalysis?.analysis?.description || '',
    ].join(' ').toLowerCase();

    return searchTerms.some(term => searchableContent.includes(term));
  });
}

async function fetchAirtableData(): Promise<AirtableRecord[]> {
  if (!AIRTABLE_API_KEY) {
    throw new Error('Airtable API key is not configured');
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    return data.records.map((record: any) => ({
      id: record.id,
      Type: record.fields.Type || 'unknown',
      Content: record.fields.Content || '',
      Timestamp: record.fields.Timestamp || new Date().toISOString(),
      Sentiment: record.fields.Sentiment || 'neutral',
      Keywords: record.fields.Keywords || '',
      Language: record.fields.Language || 'unknown',
      Topic: Array.isArray(record.fields.Topic) ? record.fields.Topic : ['general'],
      Source_Type: record.fields.Source_Type || 'unknown',
      Metadata: record.fields.Metadata || ''
    }));
  } catch (error) {
    console.error('Error fetching Airtable data:', error);
    throw error;
  }
}

function prepareSystemPrompt(data: AirtableRecord[], userQuery: string) {
  const sortedData = [...data].sort((a, b) => 
    new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()
  );

  // Buscar registros relevantes
  const relevantRecords = searchRecords(data, userQuery);
  console.log(`Found ${relevantRecords.length} relevant records for query: ${userQuery}`);

  // Generar resumen detallado por tipo
  const summaryByType = Object.entries(groupBy(sortedData, 'Type'))
    .map(([type, items]) => {
      const latestItems = items.slice(0, 3).map(item => {
        const metadata = item.Metadata ? parseMetadata(item.Metadata) : {};
        return {
          timestamp: new Date(item.Timestamp).toLocaleString(),
          content: item.Content,
          metadata: metadata,
          sentiment: item.Sentiment,
          keywords: item.Keywords,
        };
      });

      return `${type.toUpperCase()} (${items.length} total):
${latestItems
  .map(
    (item, i) =>
      `${i + 1}. [${item.timestamp}] ${item.content.substring(0, 100)}${
        item.content.length > 100 ? '...' : ''
      }`
  )
  .join('\n')}`;
    })
    .join('\n\n');

  const prompt = `Eres un asistente especializado en analizar y responder preguntas sobre una base de datos multimedia.

Base de datos actual:
${summaryByType}

${
  relevantRecords.length > 0
    ? `
Registros relevantes para tu consulta "${userQuery}":
${relevantRecords
  .map(
    (record, i) =>
      `${i + 1}. [${record.Type}] ${record.Content}`
  )
  .join('\n')}
`
    : ''
}

Instrucciones:
1. Usa la información de los registros relevantes para responder la pregunta
2. Incluye fechas y detalles específicos en tu respuesta
3. Si hay metadata disponible, úsala para proporcionar información adicional
4. Si no encuentras información específica, indícalo claramente

Responde de manera natural y detallada, siempre basándote en la información disponible.`;

  return prompt;
}

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    console.log('Processing query:', message);

    const airtableData = await fetchAirtableData();
    const systemPrompt = prepareSystemPrompt(airtableData, message);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      messages: messages as any,
      // Aquí cambiamos a gpt-3.5-turbo
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Encontrar registros relacionados con la respuesta
    const relatedRecords = searchRecords(airtableData, message);

    return NextResponse.json({
      response: completion.choices[0].message.content,
      data: {
        total_records: airtableData.length,
        types: Object.keys(groupBy(airtableData, 'Type')),
        related_records: relatedRecords.length,
        latest_update: new Date(
          Math.max(...airtableData.map(r => new Date(r.Timestamp).getTime()))
        ).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
