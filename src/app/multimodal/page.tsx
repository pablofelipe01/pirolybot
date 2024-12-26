// app/multimodal/page.tsx
'use client'

import MultiModalInput from '@/components/MultiModalInput';
import ContentViewer from '@/components/ContentViewer';


export default function MultiModalPage() {
  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <br />
      <br />
      <br />
      <div className="container mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          MultiModal AI Assistant
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Component */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Input</h2>
            <MultiModalInput />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Output</h2>
            <ContentViewer />
          </div>
          
          {/* Chat Component */}
        
        </div>
      </div>
    </main>
  );
}