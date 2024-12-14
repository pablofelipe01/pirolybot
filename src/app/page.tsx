// src/app/page.tsx
"use client";

import { ConnectButton } from "./thirdweb";
import { client } from "./client";
import { polygon } from "./chain";
import { useActiveAccount } from 'thirdweb/react';

export default function Home() {
  const account = useActiveAccount();

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {account && (
          <div>
            <h1>Hola Mundo</h1>
          </div>
        )}
      </div>
    </main>
  );
}