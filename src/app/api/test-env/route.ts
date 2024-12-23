// app/api/test-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    airtableKey: process.env.AIRTABLE_API_KEY ? 'Presente' : 'Ausente',
    airtableBase: process.env.AIRTABLE_BASE_ID ? 'Presente' : 'Ausente',
    // No imprimas las claves reales en producción
  });
}