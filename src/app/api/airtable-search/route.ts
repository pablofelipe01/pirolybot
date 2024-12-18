// app/api/airtable-search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    // Search in Airtable
    const records = await base('MultiModal')
      .select({
        filterByFormula: `OR(
          SEARCH("${query}", LOWER({Content})),
          SEARCH("${query}", LOWER({Type}))
        )`
      })
      .all();

    const results = records.map(record => ({
      id: record.id,
      Type: record.get('Type'),
      Content: record.get('Content'),
      Metadata: record.get('Metadata'),
      Fecha: record.get('Fecha')
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Airtable search error:', error);
    return NextResponse.json(
      { error: 'Failed to search Airtable' },
      { status: 500 }
    );
  }
}