// app/api/airtable-search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

const base = new Airtable({ 
  apiKey: process.env.AIRTABLE_API_KEY 
}).base(process.env.AIRTABLE_BASE_ID!);

const FIELDS = {
  KEYWORDS: ' Keywords',
  CONTENT: 'Content',
  TYPE: ' Type',
  TOPIC: ' Topic',
  LANGUAGE: ' Language',
  CLASSIFICATION: ' Classification',
  SENTIMENT: ' Sentiment',
  ID: 'ID',
  TIMESTAMP: ' Timestamp',
  SOURCE_TYPE: 'Source_Type',
  METADATA: ' Metadata'
};

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    console.log('Búsqueda:', query);

    // Si es búsqueda de última imagen
    if (query.toLowerCase().includes('última imagen')) {
      const records = await base('tbl9Rl8a2dOm5n66L')
        .select({
          maxRecords: 1,
          sort: [{ field: FIELDS.ID, direction: 'desc' }],
          filterByFormula: `{${FIELDS.TYPE}} = 'image'`
        })
        .all();

      if (records.length > 0) {
        const latestImage = records[0];
        console.log('Encontrada última imagen:', latestImage.get(FIELDS.CONTENT));
        
        return NextResponse.json({
          success: true,
          results: [{
            id: latestImage.id,
            type: latestImage.get(FIELDS.TYPE),
            content: latestImage.get(FIELDS.CONTENT),
            timestamp: latestImage.get(FIELDS.TIMESTAMP),
            topic: latestImage.get(FIELDS.TOPIC),
            sentiment: latestImage.get(FIELDS.SENTIMENT)
          }],
          totalResults: 1
        });
      }
    } 
    // Si es búsqueda del último audio
    else if (query.toLowerCase().includes('último audio')) {
      const records = await base('tbl9Rl8a2dOm5n66L')
        .select({
          maxRecords: 1,
          sort: [{ field: FIELDS.ID, direction: 'desc' }],
          filterByFormula: `{${FIELDS.TYPE}} = 'audio'`
        })
        .all();

      if (records.length > 0) {
        const latestAudio = records[0];
        return NextResponse.json({
          success: true,
          results: [{
            id: latestAudio.id,
            type: latestAudio.get(FIELDS.TYPE),
            content: latestAudio.get(FIELDS.CONTENT),
            timestamp: latestAudio.get(FIELDS.TIMESTAMP),
            topic: latestAudio.get(FIELDS.TOPIC),
            sentiment: latestAudio.get(FIELDS.SENTIMENT)
          }],
          totalResults: 1
        });
      }
    }
    // Búsqueda por defecto
    else {
      const records = await base('tbl9Rl8a2dOm5n66L')
        .select({
          maxRecords: 5,
          sort: [{ field: FIELDS.ID, direction: 'desc' }],
          filterByFormula: `SEARCH("${query.toLowerCase()}", LOWER({${FIELDS.CONTENT}}))`
        })
        .all();

      console.log('Registros encontrados:', records.length);

      return NextResponse.json({
        success: true,
        results: records.map(record => ({
          id: record.id,
          type: record.get(FIELDS.TYPE),
          content: record.get(FIELDS.CONTENT),
          timestamp: record.get(FIELDS.TIMESTAMP),
          topic: record.get(FIELDS.TOPIC),
          sentiment: record.get(FIELDS.SENTIMENT)
        })),
        totalResults: records.length
      });
    }

    return NextResponse.json({
      success: true,
      context: "No se encontraron resultados",
      totalResults: 0
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}