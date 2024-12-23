// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { airtableManager } from '@/lib/airtableManager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    // Verificar variables de entorno
    if (!process.env.AIRTABLE_API_KEY) {
      throw new Error('AIRTABLE_API_KEY no está configurada');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID no está configurada');
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    const { message } = await req.json();

    // Log para debugging en producción
    console.log('Iniciando procesamiento de mensaje:', message);

    // Cargar datos
    let data;
    try {
      data = airtableManager.getData().length > 0 
        ? airtableManager.getData()
        : await airtableManager.loadData();
      console.log('Datos cargados exitosamente:', data.length, 'registros');
    } catch (e) {
      console.error('Error cargando datos de Airtable:', e);
      throw new Error('Error al cargar datos de Airtable: ' + e.message);
    }

    // Ordenar y limitar datos
    const sortedData = [...data]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    // Log del prompt para debugging
    console.log('Preparando prompt con', sortedData.length, 'registros');

    const prompt = `
      Basado en estos datos recientes de la base de datos:
      ${JSON.stringify(sortedData, null, 2)}

      Responde a esta pregunta: "${message}"
      
      Proporciona una respuesta detallada basada en los datos disponibles.
      Si la información no está disponible en los datos proporcionados, indícalo claramente.
    `;

    // Llamada a OpenAI
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres un asistente experto en analizar datos y responder preguntas sobre ellos." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      console.log('Respuesta de OpenAI recibida exitosamente');

      return NextResponse.json({ 
        message: completion.choices[0].message.content,
        success: true
      });
    } catch (e) {
      console.error('Error en llamada a OpenAI:', e);
      throw new Error('Error en la llamada a OpenAI: ' + e.message);
    }

  } catch (error) {
    console.error('Error detallado:', error);
    return NextResponse.json({ 
      error: process.env.NODE_ENV === 'development' 
        ? `Error: ${error.message}` 
        : 'Error procesando la consulta',
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}