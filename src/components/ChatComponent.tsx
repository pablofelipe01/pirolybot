// src/components/ChatComponent.tsx
'use client'

import React, { useState, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';

export default function ChatComponent() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hola, ¿qué información necesitas de la base de datos?'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-3xl mx-auto bg-gray-900 rounded-lg">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message, i) => (
          <div
            key={i}
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
                <p className="text-sm text-gray-100 whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Haz una pregunta sobre la base de datos..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}