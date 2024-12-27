import { NextResponse } from "next/server";

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || "";
const WEBHOOK_SECRET = process.env.ASSEMBLYAI_WEBHOOK_SECRET || "";

// Ajusta con tu dominio real (si estás en Vercel: "https://<tu-proyecto>.vercel.app")
const WEBHOOK_URL = "https://https://sirius-verse.vercel.app/api/assemblyai-webhook";

export async function POST(req: Request) {
  try {
    // Verificar que sea multipart/form-data
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    // 1) Parsear el formData para obtener el audio
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // 2) Subir el audio a AssemblyAI
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
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
      throw new Error(`Error uploading audio: ${errText}`);
    }

    const { upload_url } = await uploadRes.json();

    // 3) Crear la transcripción con el webhook
    const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: "es",
        webhook_url: WEBHOOK_URL,
        // Autenticación opcional en el webhook
        webhook_auth_header_name: "Authorization",
        webhook_auth_header_value: `Bearer ${WEBHOOK_SECRET}`,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Error creating transcript: ${errText}`);
    }

    const createData = await createRes.json();
    const transcriptId = createData.id;

    // 4) Devolvemos la ID de la transcripción al cliente
    return NextResponse.json({ transcriptId });
  } catch (error: any) {
    console.error("Error in /api/chat-voice-init:", error);
    return NextResponse.json(
      { error: "STT init error", details: error.message },
      { status: 500 }
    );
  }
}
