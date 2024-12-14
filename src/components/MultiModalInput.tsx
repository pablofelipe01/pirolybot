'use client'
import React, { useState, useRef, useEffect } from "react";
import { Loader2, Clock, Mic, Send, Paperclip, X } from "lucide-react";
import confetti from "canvas-confetti";


const MultiModalInput = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const N8N_WEBHOOK_URL = "https://tok-n8n-sol.onrender.com/webhook-test/whatsapp-webhook";

  useEffect(() => {
    setIsClient(true);
    
    const loadRecordRTC = async () => {
      const RecordRTC = (await import('recordrtc')).default;
      window.RecordRTC = RecordRTC;
    };

    if (typeof window !== 'undefined') {
      loadRecordRTC();
    }
  }, []);

  const cleanup = () => {
    if (recorderRef.current) {
      recorderRef.current.destroy();
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const handleVoiceRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    if (!isClient) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const RecordRTC = (await import('recordrtc')).default;
      const recorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/webm",
        recorderType: RecordRTC.StereoAudioRecorder,
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not start recording. Please check microphone access.");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || !isRecording) return;

    recorderRef.current.stopRecording(async () => {
      const blob = recorderRef.current?.getBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
      }
      cleanup();
    });
  };

  const handleFileSelect = (event) => {
    const newFiles = Array.from(event.target.files);
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      
      // Añadir texto
      formData.append('text', text);
      
      // Añadir archivos
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
      
      // Añadir audio si existe
      if (audioBlob) {
        formData.append('audio', audioBlob, 'recording.webm');
      }
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        confetti();
        setText("");
        setFiles([]);
        setAudioUrl(null);
        setAudioBlob(null);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isClient) return null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="bg-black bg-opacity-40 rounded-lg p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escriba su mensaje aquí..."
          className="w-full h-32 p-3 rounded-lg bg-gray-800 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={handleVoiceRecording}
          disabled={isLoading}
          className={`p-3 rounded-full transition-all ${
            isRecording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          <Mic className="w-5 h-5 text-white" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-3 rounded-full bg-green-500 hover:bg-green-600 transition-all"
        >
          <Paperclip className="w-5 h-5 text-white" />
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        <button
          onClick={handleSubmit}
          disabled={isLoading || (!text && !files.length && !audioUrl)}
          className="flex-1 p-3 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium disabled:opacity-50 transition-all"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            <div className="flex items-center justify-center">
              <Send className="w-5 h-5 mr-2" />
              <span>Enviar</span>
            </div>
          )}
        </button>
      </div>

      {isRecording && (
        <div className="flex items-center justify-center text-red-400">
          <Clock className="w-4 h-4 mr-1 animate-pulse" />
          <span>Grabando...</span>
        </div>
      )}

      {audioUrl && (
        <div className="mt-4">
          <audio controls src={audioUrl} className="w-full">
            Tu navegador no soporta el elemento de audio.
          </audio>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-800 p-2 rounded-lg">
              <span className="text-sm text-gray-200 truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-gray-700 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiModalInput;