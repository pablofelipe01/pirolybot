// src/components/Navbar.tsx
"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "@/app/client";
import { polygon } from "@/app/chain";
import { formatUnits } from "viem";
import { readContract } from "thirdweb";
import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  const account = useActiveAccount();
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function getBalance() {
      if (!account?.address) return;

      setIsLoading(true);
      try {
        const result = await readContract({
          contract: {
            client,
            chain: polygon,
            address: "0xbCc839D5DAe72a650FdefBB0f928B8e73a68cE3c",
          },
          method: "function balanceOf(address account) view returns (uint256)",
          params: [account.address],
        });

        setBalance(result?.toString() || "0");
      } catch (error) {
        console.error("Error fetching balance:", error);
        setBalance("0");
      } finally {
        setIsLoading(false);
      }
    }

    getBalance();
  }, [account]);

  const formattedBalance = balance ? Number(formatUnits(balance, 18)).toFixed(2) : '0';

  return (
    <nav className="fixed top-0 w-full bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 z-50">
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10">
            <Image
              src="/logo.png"
              alt="Sirius Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Balance y Botón de Conexión */}
        <div className="flex items-center gap-2 sm:gap-4">
          {account && (
            <div className="hidden sm:flex items-center text-white space-x-4">
              <span className="text-sm sm:text-base">
                🟢 Conectado
              </span>
              <span className="text-sm font-medium bg-blue-500/20 px-3 py-1 rounded-full">
                {isLoading ? "Cargando..." : `${formattedBalance} SIRIUS`}
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
                "Conectado" : 
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