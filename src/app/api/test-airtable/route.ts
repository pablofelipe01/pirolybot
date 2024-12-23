// app/api/test-airtable/route.ts
import { NextResponse } from 'next/server';
import Airtable from 'airtable';

export async function GET() {
  try {
    // Configurar Airtable
    const airtable = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY,
      endpointUrl: 'https://api.airtable.com'
    });

    const base = airtable.base('appaXFZ4t36G8oW6X');

    // Intentar una consulta usando la vista correcta
    const records = await base('tbl9Rl8a2dOm5n66L').select({
      maxRecords: 1,
      view: "Vista Principal (All Content)" // Nombre correcto de la vista
    }).firstPage();

    return NextResponse.json({
      success: true,
      recordCount: records.length,
      sampleRecord: records.length > 0 ? {
        id: records[0].id,
        fieldNames: Object.keys(records[0].fields)
      } : null
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        type: error.name,
        message: error.message,
        config: {
          hasApiKey: !!process.env.AIRTABLE_API_KEY,
          baseId: 'appaXFZ4t36G8oW6X',
          tableId: 'tbl9Rl8a2dOm5n66L',
          view: "Vista Principal (All Content)"
        }
      }
    }, { status: 500 });
  }
}