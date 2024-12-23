// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { airtableManager } from '@/lib/airtableManager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    // Cargar datos si no están cargados
    const data = airtableManager.getData().length > 0 
      ? airtableManager.getData()
      : await airtableManager.loadData();

    const prompt = `
      Basado en estos datos de la base de datos:
      ${JSON.stringify(data, null, 2)}

      Responde a esta pregunta: "${message}"
      
      Analiza los datos disponibles y proporciona una respuesta detallada.
      Si la información no está disponible, indícalo claramente.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Eres un asistente experto en analizar datos y responder preguntas sobre ellos." },
        { role: "user", content: prompt }
      ]
    });

    return NextResponse.json({ 
      message: completion.choices[0].message.content,
      success: true
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Error procesando la consulta',
      success: false
    }, { status: 500 });
  }
}