// app/api/transcriptions/[id]/route.ts

import { NextResponse } from "next/server";
// OJO: Asegúrate de que en src/lib/prisma.ts tengas `export default prisma;`
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  // El segundo argumento: parámetros dinámicos de la ruta
  { params }: { params: { id: string } }
) {
  try {
    const transcriptId = params.id; // [id] dinámico de la URL

    // Consulta en la BD (suponiendo que tu modelo se llame "Transcription")
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptId },
    });

    if (!transcription) {
      // Si no existe, retorna 404
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Retorna el status y el texto guardados en BD
    return NextResponse.json({
      status: transcription.status,
      text: transcription.text,
    });
  } catch (error: any) {
    console.error("Error en /api/transcriptions/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
