// src/components/Navbar.tsx
"use client";

import { ConnectButton } from "thirdweb/react";
import { client } from "@/app/client";
import { polygon } from "@/app/chain";
import { useActiveAccount } from 'thirdweb/react';

export function Navbar() {
  const account = useActiveAccount();

  return (
    <nav className="fixed top-0 w-full bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 z-50">
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-end">
        <div className="flex items-center gap-2 sm:gap-4">
          {account && (
            <div className="hidden sm:block text-white">
              <span className="mr-2 sm:mr-4 text-sm sm:text-base">
                🟢 Conectado
              </span>
            </div>
          )}
          
          <ConnectButton
            client={client}
            chain={polygon}
            connectModal={{ 
              size: "compact",
              title: "Sirius Verse",
              welcomeScreen: {
                title: "Bienvenido Sirius Verse",
                subtitle: "Conecta tu wallet para continuar"
              }
            }}
            connectButton={{ 
              label: account ? 
                "Conectado" : // Texto más corto para móviles
                "Sirius Verse",
              className: `
                ${account 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-blue-500 hover:bg-blue-600"
                } 
                text-white 
                px-3 sm:px-4 
                py-1.5 sm:py-2 
                text-sm sm:text-base 
                rounded-lg 
                transition-colors
                whitespace-nowrap
                font-medium
                min-w-[100px] sm:min-w-[140px]
                flex items-center justify-center
              `
            }}
          />
        </div>
      </div>
    </nav>
  );
}