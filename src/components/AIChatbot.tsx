// components/AIChatBot.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Search, Bot, Loader2, Send, User, StopCircle } from 'lucide-react';
import { ModelSelector, AI_MODELS, type ModelOption } from './ModelSelector';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'audio';
  model?: string;
}

const AIChatBot = () => {
  // Estados
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [airtableData, setAirtableData] = useState([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AI_MODELS[0]);

  // Referencias
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Efecto para scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Manejo de grabación de audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioInput(audioBlob);
        
        // Limpiar el stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Manejo de entrada de audio
  const handleAudioInput = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('model', selectedModel.id);
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'user',
        content: data.text,
        type: 'audio'
      }]);

      await processAIResponse(data.text);
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Búsqueda en Airtable
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/airtable-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setAirtableData(data);
      
      const summaryMessage = `Found ${data.length} entries in the database. Here's a summary:\n\n` +
        data.slice(0, 3).map((item: any) => `- ${item.Type}: ${item.Content.slice(0, 100)}...`).join('\n');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: summaryMessage,
        type: 'text',
        model: selectedModel.name
      }]);

    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Procesamiento de respuesta AI
  const processAIResponse = async (userInput: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userInput,
          context: airtableData,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        throw new Error('AI processing failed');
      }

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        type: 'text',
        model: selectedModel.name
      }]);
    } catch (error) {
      console.error('AI processing error:', error);
      alert('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de envío de mensaje
  const handleSubmit = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      type: 'text'
    }]);

    await processAIResponse(userMessage);
  };

  // Manejo de tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 space-y-4">
        <ModelSelector 
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search in Airtable..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start gap-2 max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}>
              {message.role === 'user' ? 
                <User className="w-6 h-6 text-blue-400" /> :
                <Bot className="w-6 h-6 text-green-400" />
              }
              <div className={`rounded-lg p-3 ${
                message.role === 'user' ? 'bg-blue-900' : 'bg-gray-800'
              }`}>
                <p className="text-sm text-gray-100 whitespace-pre-wrap">{message.content}</p>
                {message.type === 'audio' && (
                  <span className="text-xs text-gray-400 mt-1">🎤 Voice message</span>
                )}
                {message.model && (
                  <span className="text-xs text-gray-400 block mt-1">
                    Using: {message.model}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`p-2 rounded-md transition-colors ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isRecording ? (
              <StopCircle className="w-5 h-5 text-white" />
            ) : (
              <Mic className="w-5 h-5 text-white" />
            )}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading || isRecording}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || isRecording || !inputText.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        {isRecording && (
          <div className="text-red-400 text-sm mt-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording...
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChatBot;