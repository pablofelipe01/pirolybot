//app/api/airtable/content/route.ts

import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'appaXFZ4t36G8oW6X';
const AIRTABLE_TABLE_ID = 'tbl9Rl8a2dOm5n66L';

export async function GET() {
  // Log environment variables (for debugging)
  console.log('Checking API key:', AIRTABLE_API_KEY ? 'Present' : 'Missing');

  if (!AIRTABLE_API_KEY) {
    console.error('API key is missing');
    return NextResponse.json(
      { error: 'Airtable API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`;
    console.log('Fetching from URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 10 } // Cache for 10 seconds
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', errorText);
      throw new Error(`Airtable API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.records) {
      console.error('Invalid data structure:', data);
      throw new Error('Invalid data structure received from Airtable');
    }

    const records = data.records.map((record: any) => ({
      id: record.id,
      ...record.fields
    }));

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}