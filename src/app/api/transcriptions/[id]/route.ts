// app/api/transcriptions/[id]/route.ts

import { NextResponse } from "next/server";
// Importa tu instancia de Prisma o tu conexión a la BD:
import prisma from "@/lib/prisma"; // Ajusta la ruta a tu archivo de configuración

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // params.id es el "transcriptId" que buscas
    const transcriptId = params.id;

    // Buscar el registro en la base de datos
    const transcription = await prisma.transcription.findUnique({
      where: { id: transcriptId },
    });

    // Si no existe, retornas 404
    if (!transcription) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Retorna el status y el texto
    return NextResponse.json({
      status: transcription.status,
      text: transcription.text,
    });
  } catch (error: any) {
    console.error("Error /api/transcriptions/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
