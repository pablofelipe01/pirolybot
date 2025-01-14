// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { groupBy } from 'lodash';

// Inicializamos el cliente de OpenAI con la API key desde variables de entorno
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuración para acceder a las tablas de Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'apprXBBomgiKhVc50';
const TABLES = {
  BIOMASA: 'tbl2HxsMWGEq6uzrO',
  BITACORA: 'tblXUkU6GpZa94eJp'
};

// Función auxiliar para manejar de forma segura la conversión de cualquier valor a string
function safeToString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

// Función para formatear fechas de manera consistente
function formatDate(date: string | number | Date): string {
  try {
    return new Date(date).toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (error) {
    return 'Fecha no válida';
  }
}

// Función principal para obtener datos de cualquier tabla de Airtable
async function fetchTableData(tableId: string) {
  if (!AIRTABLE_API_KEY) {
    throw new Error('Airtable API key no está configurada');
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}`;
    console.log('Consultando tabla:', tableId);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 10 } // Cache por 10 segundos
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de API de Airtable:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Error de API de Airtable: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.records) {
      throw new Error('Estructura de datos inválida recibida de Airtable');
    }

    return data.records.map((record: any) => ({
      id: record.id,
      ...record.fields
    }));
  } catch (error) {
    console.error('Error al obtener datos de la tabla:', tableId, error);
    throw error;
  }
}

// Función para preparar el prompt del sistema con información de ambas tablas
function prepareSystemPrompt(biomasaData: any[], bitacoraData: any[], userQuery: string) {
  // Ordenamos los datos por fecha más reciente
  const sortedBitacora = bitacoraData
    .sort((a, b) => new Date(b.fecha_bitacora || 0).getTime() - new Date(a.fecha_bitacora || 0).getTime())
    .slice(0, 5);

  const sortedBiomasa = biomasaData
    .sort((a, b) => new Date(b['Fecha Inicio Turno'] || 0).getTime() - new Date(a['Fecha Inicio Turno'] || 0).getTime())
    .slice(0, 5);

  // Calculamos estadísticas relevantes de los datos técnicos
  const biomasaStats = {
    operadores: Array.from(new Set(biomasaData.map(r => r['Operador']))).filter(Boolean),
    promedioConsumoGas: biomasaData.reduce((acc, r) => acc + (r['Consumo Gas Inicial'] || 0), 0) / biomasaData.length,
    ultimoTurno: sortedBiomasa[0] ? {
      operador: sortedBiomasa[0]['Operador'],
      fecha: formatDate(sortedBiomasa[0]['Fecha Inicio Turno']),
      consumoGas: sortedBiomasa[0]['Consumo Gas Inicial']
    } : null
  };

  // Preparamos un resumen de eventos recientes de la bitácora
  const eventosRecientes = sortedBitacora
    .map(b => ({
      fecha: formatDate(b.fecha_bitacora),
      observacion: b.observaciones,
      autor: b.ultima_modificacion_por
    }))
    .filter(e => e.observacion); // Filtramos entradas sin observaciones

  // Construimos el prompt del sistema
  return `Eres un asistente especializado en analizar datos de operación de una planta de biomasa y su bitácora.

Resumen técnico actual:
- Operadores activos: ${biomasaStats.operadores.join(', ')}
- Promedio de consumo de gas: ${biomasaStats.promedioConsumoGas.toFixed(2)} unidades
- Último turno registrado: ${biomasaStats.ultimoTurno ? 
  `${biomasaStats.ultimoTurno.operador} (${biomasaStats.ultimoTurno.fecha}) - Consumo inicial: ${biomasaStats.ultimoTurno.consumoGas}` : 
  'No disponible'}

Últimos eventos registrados en bitácora:
${eventosRecientes.map(e => 
  `[${e.fecha}] ${e.observacion}`
).join('\n')}

Últimos registros técnicos:
${sortedBiomasa.map(r => 
  `[${formatDate(r['Fecha Inicio Turno'])}] Operador: ${r['Operador']}, Consumo Gas: ${r['Consumo Gas Inicial']}`
).join('\n')}

Instrucciones específicas:
1. Analiza tanto los datos técnicos como las observaciones de bitácora
2. Relaciona los eventos registrados con las mediciones técnicas cuando sea relevante
3. Proporciona contexto temporal claro, relacionando fechas y eventos
4. Da prioridad a la información más reciente en tus análisis
5. Incluye datos numéricos específicos cuando estén disponibles
6. Si identificas patrones o tendencias, menciónalos

Responde de manera clara y detallada, estableciendo conexiones entre las observaciones y los datos técnicos cuando sea posible. Sé específico con fechas y mediciones.`;
}

// Función para buscar en ambas tablas de manera eficiente
async function searchAllRecords(query: string) {
  try {
    // Obtenemos datos de ambas tablas en paralelo
    const [biomasaData, bitacoraData] = await Promise.all([
      fetchTableData(TABLES.BIOMASA),
      fetchTableData(TABLES.BITACORA)
    ]);

    const searchTerms = query.toLowerCase().split(' ');

    // Búsqueda en datos de biomasa
    const biomasaResults = biomasaData.filter((record: any) => {
      const searchableContent = [
        safeToString(record['Operador']),
        safeToString(record['Estado Operador']),
        safeToString(record['Consumo Gas Inicial']),
        safeToString(record['Fecha Inicio Turno'])
      ].join(' ').toLowerCase();

      return searchTerms.some(term => searchableContent.includes(term));
    });

    // Búsqueda en bitácora
    const bitacoraResults = bitacoraData.filter((record: any) => {
      const searchableContent = [
        safeToString(record.observaciones),
        safeToString(record.fecha_bitacora),
        safeToString(record.ultima_modificacion_por)
      ].join(' ').toLowerCase();

      return searchTerms.some(term => searchableContent.includes(term));
    });

    return {
      biomasa: biomasaResults,
      bitacora: bitacoraResults,
      allData: { biomasaData, bitacoraData }
    };
  } catch (error) {
    console.error('Error en búsqueda:', error);
    throw error;
  }
}

// Manejador principal de las peticiones POST
export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    console.log('Procesando consulta:', message);

    const searchResults = await searchAllRecords(message);
    const { biomasaData, bitacoraData } = searchResults.allData;

    const systemPrompt = prepareSystemPrompt(biomasaData, bitacoraData, message);

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
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseData = {
      response: completion.choices[0].message.content,
      data: {
        total_records: biomasaData.length + bitacoraData.length,
        types: ['Biomasa', 'Bitácora'],
        related_records: searchResults.biomasa.length + searchResults.bitacora.length,
        latest_update: new Date(
          Math.max(
            ...biomasaData.map(r => new Date(r['Fecha Inicio Turno'] || 0).getTime()),
            ...bitacoraData.map(r => new Date(r.fecha_bitacora || 0).getTime())
          )
        ).toISOString(),
      },
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error en el endpoint de chat:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Error desconocido',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}