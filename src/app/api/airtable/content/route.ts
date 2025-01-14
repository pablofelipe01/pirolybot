// app/api/airtable/content/route.ts
import { NextResponse } from 'next/server';

// Define the structure of our Airtable record
// This ensures type safety throughout our application
interface AirtableRecord {
  id: string;
  Name: string;
  Status: string;
  Priority: string;
  'Assigned To'?: string[];
  'Due Date'?: string;
  Progress?: number;
  'Start Date'?: string;
  'End Date'?: string;
  Department?: string[];
  Category?: string;
  Description?: string;
  Notes?: string;
  Tags?: string[];
  'Last Modified'?: string;
  createdTime: string;
}

// Configuration constants
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = 'apprXBBomgiKhVc50';
const AIRTABLE_TABLE_ID = 'tbl2HxsMWGEq6uzrO';

// Helper function to validate the Airtable response
function validateAirtableResponse(data: any): data is { records: Array<{ id: string; fields: Partial<AirtableRecord> }> } {
  return (
    data &&
    Array.isArray(data.records) &&
    data.records.every((record: any) =>
      record &&
      typeof record.id === 'string' &&
      record.fields &&
      typeof record.fields === 'object'
    )
  );
}

// Helper function to format a record with proper typing
function formatRecord(record: { id: string; fields: Partial<AirtableRecord> }): AirtableRecord {
  return {
    id: record.id,
    Name: record.fields.Name || '',
    Status: record.fields.Status || 'Not Started',
    Priority: record.fields.Priority || 'Medium',
    'Assigned To': Array.isArray(record.fields['Assigned To']) ? record.fields['Assigned To'] : [],
    'Due Date': record.fields['Due Date'],
    Progress: typeof record.fields.Progress === 'number' ? record.fields.Progress : 0,
    'Start Date': record.fields['Start Date'],
    'End Date': record.fields['End Date'],
    Department: Array.isArray(record.fields.Department) ? record.fields.Department : [],
    Category: record.fields.Category,
    Description: record.fields.Description,
    Notes: record.fields.Notes,
    Tags: Array.isArray(record.fields.Tags) ? record.fields.Tags : [],
    'Last Modified': record.fields['Last Modified'],
    createdTime: record.fields.createdTime || new Date().toISOString(),
  };
}

export async function GET() {
  // Log environment variables for debugging
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
    
    // Validate the response structure
    if (!validateAirtableResponse(data)) {
      console.error('Invalid data structure:', data);
      throw new Error('Invalid data structure received from Airtable');
    }

    // Transform and validate the records
    const records = data.records.map(record => formatRecord(record));

    // Add metadata to the response
    const responseData = {
      records,
      metadata: {
        total_records: records.length,
        departments: Array.from(new Set(records.flatMap(r => r.Department || []))),
        statuses: Array.from(new Set(records.map(r => r.Status))),
        latest_update: records
          .map(r => r['Last Modified'] || r.createdTime)
          .sort()
          .reverse()[0],
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}