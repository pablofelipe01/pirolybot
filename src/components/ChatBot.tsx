import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  SendHorizonal,
  Loader2,
  Image as ImageIcon,
  FileText,
  Headphones,
  Info,
  Trash2,
  Mic,
} from "lucide-react";

// Tipos
interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatBotProps {
  className?: string;
}

interface DbStats {
  total_records: number;
  types: string[];
  related_records?: number;
  latest_update?: string;
}

const SUGGESTED_QUERIES = [
  "¿Cuál es la última imagen en la base de datos?",
  "¿Hay alguna imagen similar a la última subida?",
  "¿Cuál es el sentimiento general de los últimos textos?",
  "Resume los últimos 3 documentos",
  "¿Hay audios en español?",
];

const ChatBot = ({ className }: ChatBotProps) => {
  // Estados del chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Para /api/chat
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isTyping, setIsTyping] = useState(false); // Para mostrar "Escribiendo..."

  // Estados de grabación
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Estado de transcripción
  const [isTranscribing, setIsTranscribing] = useState(false);

  // References para grabación (RecordRTC)
  const recorderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cargar la librería de grabación
  useEffect(() => {
    const loadRecordRTC = async () => {
      const RecordRTC = (await import("recordrtc")).default;
      (window as any).RecordRTC = RecordRTC;
    };
    if (typeof window !== "undefined") {
      loadRecordRTC();
    }
  }, []);

  // Scroll automático
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) as HTMLElement;
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    };
    scrollToBottom();
  }, [messages, isTyping]);

  // ------------------------------------------------------------------------------
  // 1. Grabación de Audio
  // ------------------------------------------------------------------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const RecordRTC = (window as any).RecordRTC;
      if (!RecordRTC) {
        alert("No se pudo cargar la librería de grabación.");
        return;
      }

      const recorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/webm",
        recorderType: RecordRTC.StereoAudioRecorder,
      });
      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Error al iniciar la grabación:", error);
      alert("No se pudo iniciar la grabación. Permiso de micrófono denegado?");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || !isRecording) return;

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current.getBlob();
      if (blob) {
        setAudioBlob(blob);
      }
      cleanupRecording();
    });
  };

  const cleanupRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.destroy();
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const handleVoiceRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  // ------------------------------------------------------------------------------
  // 2. Enviar audio a /api/chat-voice-init para iniciar transcripción
  // ------------------------------------------------------------------------------
  const handleSendVoice = async () => {
    if (!audioBlob) return;

    try {
      setIsTranscribing(true);

      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      // Llamamos a /api/chat-voice-init
      const res = await fetch("/api/chat-voice-init", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        throw new Error("No se pudo iniciar la transcripción");
      }

      const data = await res.json();
      const transcriptId = data.transcriptId;
      console.log("Se inició la transcripción con ID:", transcriptId);

      // Iniciamos el polling para ver si ya está lista
      pollTranscriptionStatus(transcriptId);
      setAudioBlob(null);
    } catch (error) {
      console.error("Error al enviar el audio a /api/chat-voice-init:", error);
      alert("No se pudo transcribir el audio, intenta de nuevo.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // ------------------------------------------------------------------------------
  // 3. Polling a /api/transcriptions/[id] hasta status="completed"
  // ------------------------------------------------------------------------------
  const pollTranscriptionStatus = (transcriptId: string) => {
    let attempts = 0;
    const maxAttempts = 40; // ~2 minutos si cada poll es 3s

    const intervalId = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(intervalId);
        alert("Se tardó demasiado en transcribir.");
        return;
      }

      try {
        const res = await fetch(`/api/transcriptions/${transcriptId}`);
        if (res.ok) {
          const { status, text } = await res.json();
          // status puede ser "completed", "processing", "error", etc.
          if (status === "completed") {
            clearInterval(intervalId);

            // text contiene la transcripción final
            console.log("Transcripción completada:", text);

            // 1) Añadir un mensaje "user" al chat con ese texto
            const userMessage: Message = {
              id: Date.now().toString(),
              content: text,
              role: "user",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMessage]);

            // 2) (Opcional) Llamar al /api/chat con ese texto para obtener respuesta
            handleSendMessage(text);
          } else if (status === "error") {
            clearInterval(intervalId);
            alert("Hubo un error en la transcripción");
          }
        }
      } catch (error) {
        console.error("Error consultando /api/transcriptions/[id]", error);
        // Podrías ignorar, reintentar, etc.
      }
    }, 3000); // cada 3s
  };

  // ------------------------------------------------------------------------------
  // 4. Enviar texto normal a /api/chat
  // ------------------------------------------------------------------------------
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Crear mensaje "user"
    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map(({ content, role }) => ({ content, role })),
        }),
      });

      if (!response.ok) {
        throw new Error("Falla en la respuesta del chat");
      }

      const data = await response.json();

      // Crear mensaje "assistant"
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Si el endpoint chat retorna stats
      if (data.data) {
        setDbStats(data.data);
      }
    } catch (error) {
      console.error("Error en handleSendMessage:", error);
      const userFriendlyMessage = "Lo siento, ocurrió un error con el Chat.";
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          content: userFriendlyMessage,
          role: "assistant",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  // ------------------------------------------------------------------------------
  // 5. Limpiar chat
  // ------------------------------------------------------------------------------
  const clearChat = () => {
    setMessages([]);
    setAudioBlob(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // ------------------------------------------------------------------------------
  // Render UI
  // ------------------------------------------------------------------------------
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "text":
        return <FileText className="w-4 h-4" />;
      case "audio":
        return <Headphones className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === "user";
    return (
      <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
        {/* Bot avatar */}
        {!isUser && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>AI</AvatarFallback>
            <AvatarImage src="/capi.jpeg" />
          </Avatar>
        )}

        <div
          className={`rounded-lg px-4 py-2 max-w-[85%] break-words ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          <div className="text-sm whitespace-pre-wrap leading-normal">
            {message.content}
          </div>
          <span className="text-xs opacity-50 mt-1 block">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* User avatar */}
        {isUser && (
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback>US</AvatarFallback>
            <AvatarImage src="/user-avatar.png" />
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <Card className={`w-full flex flex-col ${className}`}>
      <CardContent className="flex-1 flex flex-col p-4 h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 mb-2">
          <div className="flex items-center gap-2">
            <img
              src="/capi.jpeg"
              alt="Capi Icon"
              className="w-5 h-5 rounded-full"
            />
            <h3 className="font-medium">Capi: Asistente del SIRIUS Verse</h3>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="ml-2"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* DB Stats (si existen) */}
          {dbStats && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Info className="w-4 h-4" />
                    {dbStats.total_records} registros
                    {dbStats.related_records !== undefined && (
                      <Badge variant="secondary" className="ml-2">
                        {dbStats.related_records} relacionados
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-2">
                    <p className="font-medium">Tipos de contenido:</p>
                    <div className="flex gap-2 flex-wrap">
                      {dbStats.types.map((type) => (
                        <Badge
                          key={type}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {getTypeIcon(type)}
                          {type}
                        </Badge>
                      ))}
                    </div>
                    {dbStats.latest_update && (
                      <p className="text-xs text-muted-foreground">
                        Última actualización:{" "}
                        {new Date(dbStats.latest_update).toLocaleString()}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Área de mensajes con scroll */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4 pr-4">
              {messages.length === 0 ? (
                <div className="text-center space-y-4 py-8 px-2">
                  <img
                    src="/capi.jpeg"
                    alt="Capi Icon"
                    className="w-12 h-12 mx-auto rounded-full"
                  />
                  <div className="space-y-2">
                    <h4 className="font-medium">¡Hola! Me llamo Capi.</h4>
                    <p className="text-sm text-muted-foreground">
                      Soy tu asistente en el SIRIUS Verse. ¡Pregúntame lo que
                      necesites y con gusto te ayudaré!
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    {SUGGESTED_QUERIES.map((query, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start text-sm whitespace-normal break-words"
                        onClick={() => handleSendMessage(query)}
                      >
                        {query}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {isTyping && (
                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                      <img
                        src="/capi.jpeg"
                        alt="Capi Icon"
                        className="w-4 h-4 rounded-full"
                      />
                      <span className="text-sm">Escribiendo...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer con input y control de audio */}
        <div className="mt-4 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Haz tu pregunta o comenta algo..."
              className="flex-1"
              disabled={isLoading}
              ref={inputRef}
            />

            {/* Botón de micrófono */}
            <Button
              type="button"
              onClick={handleVoiceRecording}
              variant={isRecording ? "destructive" : "default"}
              disabled={isLoading}
            >
              <Mic className="h-4 w-4" />
            </Button>

            {/* Botón enviar texto */}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </Button>
          </form>

          {/* Si hay audio grabado, lo mostramos y dejamos enviar */}
          {audioBlob && (
            <div className="mt-2 border border-dashed p-2 rounded-md text-xs">
              <p className="text-muted-foreground mb-1">Audio grabado:</p>
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                className="w-full mb-1"
              />

              {isTranscribing ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Transcribiendo audio...</span>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSendVoice}>
                  Enviar voz
                </Button>
              )}
            </div>
          )}

          {/* Badges de ejemplo */}
          <div className="flex flex-wrap gap-2 mt-2 px-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 cursor-help"
                  >
                    <ImageIcon className="w-3 h-3" />
                    Imágenes disponibles
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Puedo analizar y comparar imágenes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 cursor-help"
                  >
                    <FileText className="w-3 h-3" />
                    Textos y documentos
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Puedo analizar contenido textual</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1 cursor-help"
                  >
                    <Headphones className="w-3 h-3" />
                    Audio disponible
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Puedo analizar transcripciones de audio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatBot;
