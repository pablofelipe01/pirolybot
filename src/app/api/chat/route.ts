// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Airtable from 'airtable';

// Inicializar Airtable directamente en lugar de usar un manager
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    // Obtener datos directamente
    const records = await base('tbl9Rl8a2dOm5n66L')
      .select({
        maxRecords: 10,
        sort: [{ field: ' Timestamp', direction: 'desc' }]
      })
      .all();

    // Convertir registros a formato simple
    const data = records.map(record => ({
      id: record.get('ID'),
      type: record.get(' Type'),
      content: record.get('Content'),
      timestamp: record.get(' Timestamp'),
      topic: record.get(' Topic'),
      sentiment: record.get(' Sentiment')
    }));

    const prompt = `
      Basado en estos datos de la base de datos:
      ${JSON.stringify(data, null, 2)}

      Responde a esta pregunta: "${message}"
      
      Proporciona una respuesta detallada basada en los datos disponibles.
      Si la información no está disponible, indícalo claramente.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Eres un asistente experto en analizar datos y responder preguntas sobre ellos." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return NextResponse.json({ 
      message: completion.choices[0].message.content,
      success: true
    });

  } catch (error: any) {
    console.error('Error detallado:', error);
    return NextResponse.json({ 
      error: 'Error procesando la consulta',
      success: false,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}