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

    // Ordenar los datos por timestamp en orden descendente y tomar los más recientes
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 10); // Tomamos solo los 10 más recientes

    const prompt = `
      Basado en estos datos recientes de la base de datos:
      ${JSON.stringify(sortedData, null, 2)}

      Responde a esta pregunta: "${message}"
      
      Proporciona una respuesta detallada basada en los datos disponibles.
      Si la información no está disponible en los datos proporcionados, indícalo claramente.
      
      Para preguntas sobre el último elemento de un tipo específico (imagen, audio, etc.),
      usa el elemento más reciente según la fecha en los datos proporcionados.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Cambiamos a gpt-3.5-turbo para evitar límites de tokens
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

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Error procesando la consulta',
      success: false
    }, { status: 500 });
  }
}