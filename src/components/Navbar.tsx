// src/components/Navbar.tsx
"use client";

import { ConnectButton } from "thirdweb/react";

import { client } from "@/app/client";
import { polygon } from "@/app/chain";
import Link from 'next/link';
import { useActiveAccount } from 'thirdweb/react';

export function Navbar() {
  const account = useActiveAccount();

  return (
    <nav className="fixed top-0 w-full bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* <Link 
          href="/" 
          className="text-xl font-bold text-white hover:text-blue-400 transition-colors"
        >
          Sirius Verse
        </Link> */}

        <div className="flex items-center gap-4">
          {account && (
            <div className="text-white">
              {/* Contenido que solo se muestra cuando la wallet está conectada */}
              <span className="mr-4">🟢 Conectado</span>
            </div>
          )}
          
          <ConnectButton
            client={client}
            chain={polygon}
            connectModal={{ 
              size: "compact",
              title: "Conectar Wallet",
              welcomeScreen: {
                title: "Bienvenido a Sirius Verse",
                subtitle: "Conecta tu wallet para continuar"
              }
            }}
            connectButton={{ 
              label: account ? "Wallet Conectada" : "Conectar Wallet",
              className: account 
                ? "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                : "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            }}
          />
        </div>
      </div>
    </nav>
  );
}