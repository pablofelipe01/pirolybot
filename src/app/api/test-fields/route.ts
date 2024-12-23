// app/api/test-fields/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

const base = new Airtable({ 
  apiKey: process.env.AIRTABLE_API_KEY 
}).base(process.env.AIRTABLE_BASE_ID!);

export async function GET() {
  try {
    const records = await base('tbl9Rl8a2dOm5n66L')
      .select({ maxRecords: 1 })
      .all();

    if (records.length > 0) {
      const fields = Object.keys(records[0].fields);
      return NextResponse.json({ fields });
    }

    return NextResponse.json({ error: 'No records found' });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}