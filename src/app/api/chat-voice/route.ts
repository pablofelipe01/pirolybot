import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || "";

async function startTranscription(audioBuffer: Buffer, transcriptionId: string) {
  try {
    // 1. Actualizar estado a processing
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: { status: "processing" }
    });

    // 2. Subir a AssemblyAI
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "Content-Type": "application/octet-stream",
      },
      body: audioBuffer,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${await uploadRes.text()}`);
    }

    const { upload_url } = await uploadRes.json();

    // 3. Crear transcripción
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: "es",
      }),
    });

    if (!transcriptRes.ok) {
      throw new Error(`Transcript creation failed: ${await transcriptRes.text()}`);
    }

    const { id: assemblyId } = await transcriptRes.json();

    // 4. Polling hasta completar
    let attempts = 0;
    while (attempts < 30) { // máximo 5 minutos
      await new Promise(r => setTimeout(r, 10000)); // esperar 10 segundos

      const statusRes = await fetch(
        `https://api.assemblyai.com/v2/transcript/${assemblyId}`,
        { headers: { authorization: ASSEMBLYAI_API_KEY } }
      );
      
      const statusData = await statusRes.json();

      if (statusData.status === "completed") {
        // Actualizar DB con transcripción exitosa
        await prisma.transcription.update({
          where: { id: transcriptionId },
          data: {
            status: "completed",
            transcript: statusData.text
          }
        });
        return;
      } else if (statusData.status === "error") {
        throw new Error(`AssemblyAI error: ${statusData.error}`);
      }

      attempts++;
    }

    throw new Error("Transcription timed out");

  } catch (error: any) {
    // Actualizar DB con error
    await prisma.transcription.update({
      where: { id: transcriptionId },
      data: {
        status: "error",
        error: error.message
      }
    });
  }
}

export async function POST(req: Request) {
  try {
    // Verificar content-type
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Leer audio
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Crear registro en DB
    const transcription = await prisma.transcription.create({
      data: {
        status: "pending",
      }
    });

    // Convertir a Buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Iniciar proceso en background
    startTranscription(audioBuffer, transcription.id).catch(console.error);

    // Devolver ID inmediatamente
    return NextResponse.json({
      status: "processing",
      transcriptionId: transcription.id
    });

  } catch (error: any) {
    console.error("Error in /api/chat-voice:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error.message },
      { status: 500 }
    );
  }
}