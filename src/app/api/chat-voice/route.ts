// app/api/chat-voice/route.ts
import { NextResponse } from "next/server";

/**
 * Recibe audio en multipart/form-data (campo 'audio'),
 * sube a AssemblyAI y devuelve la transcripción final.
 *
 * NOTA:
 * - Asegúrate de estar en HTTPS en producción.
 * - Ajusta timeouts y manejo de errores a tus necesidades.
 */

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || "";

export async function POST(req: Request) {
  try {
    // Verificar que sea multipart/form-data
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid content type (expected multipart/form-data)" },
        { status: 400 }
      );
    }

    // Leer formData
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convertir a Buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // 1) Subir a AssemblyAI
    //    QUITAMOS la cabecera "transfer-encoding": "chunked"
    //    y usamos "Content-Type": "application/octet-stream"
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "Content-Type": "application/octet-stream",
      },
      body: audioBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Error uploading to AssemblyAI: ${errText}`);
    }

    const { upload_url } = await uploadRes.json();

    // 2) Crear la transcripción
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: "es", // Ajusta si tu audio es en otro idioma
      }),
    });

    if (!transcriptRes.ok) {
      const errText = await transcriptRes.text();
      throw new Error(`Error creating transcript: ${errText}`);
    }

    const transcriptData = await transcriptRes.json();
    const transcriptId = transcriptData.id;

    // 3) Polling hasta que la transcripción esté lista
    let transcriptText = null;
    let attempts = 0;

    while (!transcriptText) {
      if (attempts > 50) {
        throw new Error("Transcription timed out");
      }
      // Esperar 3 segundos
      await new Promise((r) => setTimeout(r, 3000));

      const statusRes = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { authorization: ASSEMBLYAI_API_KEY } }
      );
      const statusData = await statusRes.json();

      if (statusData.status === "completed") {
        transcriptText = statusData.text;
      } else if (statusData.status === "error") {
        throw new Error(`Transcription error: ${statusData.error}`);
      }
      attempts++;
    }

    // 4) Devolver la transcripción
    return NextResponse.json({
      transcript: transcriptText,
    });
  } catch (error: any) {
    console.error("Error in /api/chat-voice:", error);
    return NextResponse.json(
      { error: "STT error", details: error.message },
      { status: 500 }
    );
  }
}
