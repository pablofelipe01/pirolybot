// app/api/assemblyai-webhook/route.ts

import { NextResponse } from "next/server";

// Obtenemos nuestro SECRET del .env (opcional, si quieres proteger el webhook)
const WEBHOOK_SECRET = process.env.ASSEMBLYAI_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  try {
    // (Opcional) Validar el header de autorización
    // Solo aceptamos la petición si coincide
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Leer el body JSON que manda AssemblyAI
    // Ejemplo de body: { id, status, text, words, error... }
    const body = await req.json();

    const transcriptId = body.id;
    const status = body.status;
    const text = body.text;

    console.log(">>> Webhook AssemblyAI recibido:", {
      transcriptId,
      status,
      text: text ? text.slice(0, 50) + "..." : "",
    });

    // Aquí puedes guardar en DB la info: status, text, etc.
    // p. ej.:
    // await db.transcriptions.upsert({
    //   where: { id: transcriptId },
    //   update: { status, text },
    //   create: { id: transcriptId, status, text },
    // });

    // Devuelve una respuesta de éxito
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error en /api/assemblyai-webhook:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
