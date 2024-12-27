"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { client } from "@/app/client";
import { polygon } from "@/app/chain";
import { formatUnits } from "viem";
import { readContract } from "thirdweb";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  const account = useActiveAccount();
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const formattedBalance = balance
    ? Number(formatUnits(balance, 18)).toFixed(2)
    : "0";

  return (
    <nav className="fixed top-0 w-full bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 z-50">
      <div className="container mx-auto px-2 sm:px-4 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <div className="relative w-24 h-24 -my-10">
            <Image
              src="/logo.png"
              alt="Sirius Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Versión Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {account && (
            <>
              {/* Balance + Conectado */}
              <div className="flex items-center text-white space-x-4">
                <span className="text-sm sm:text-base">🟢 Conectado</span>
                <span className="text-sm font-medium bg-blue-500/20 px-3 py-1 rounded-full">
                  {isLoading ? "Cargando..." : `${formattedBalance} SIRIUS`}
                </span>
              </div>

              {/* Link a /multimodal (Back) */}
              <Link
                href="/multimodal"
                className="text-white text-sm font-medium bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1 rounded-full transition-colors"
              >
                Back
              </Link>

              {/* Ícono de Capi que enlaza a /bot */}
              <Link href="/bot">
                <Image
                  src="/capi.jpeg"
                  alt="Capi Icon"
                  width={36}
                  height={36}
                  className="rounded-full hover:opacity-90"
                />
              </Link>
            </>
          )}

          <ConnectButton
            client={client}
            chain={polygon}
            connectModal={{
              size: "compact",
              title: "Sirius Verse",
              welcomeScreen: {
                title: "Bienvenido Sirius Verse",
                subtitle: "Conecta tu wallet para continuar",
              },
            }}
            connectButton={{
              label: account ? "Conectado" : "Sirius Verse",
              className: `
                ${
                  account
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-blue-500 hover:bg-blue-600"
                }
                text-white 
                px-4 py-2
                text-sm sm:text-base 
                rounded-lg 
                transition-colors
                whitespace-nowrap
                font-medium
                min-w-[140px]
                flex items-center justify-center
              `,
            }}
          />
        </div>

        {/* Botón de Menú (Hamburguesa) - sólo visible en mobile */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg"
        >
          {isMenuOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            </svg>
          )}
        </button>
      </div>

      {/* Menú Móvil */}
      {isMenuOpen && (
        <div className="md:hidden bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {account && (
              <>
                {/* Balance + Conectado */}
                <div className="flex flex-col items-center text-white space-y-2">
                  <span className="text-sm">🟢 Conectado</span>
                  <span className="text-sm font-medium bg-blue-500/20 px-3 py-1 rounded-full">
                    {isLoading ? "Cargando..." : `${formattedBalance} SIRIUS`}
                  </span>
                </div>

                {/* Link a /multimodal (Back) + ícono de Capi */}
                <div className="flex justify-center items-center gap-4">
                  <Link
                    href="/multimodal"
                    className="text-white text-sm font-medium bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1 rounded-full transition-colors"
                  >
                    Back
                  </Link>
                  <Link href="/bot">
                    <Image
                      src="/capi.jpeg"
                      alt="Capi Icon"
                      width={48}
                      height={48}
                      className="rounded-full hover:opacity-90"
                    />
                  </Link>
                </div>
              </>
            )}

            <div className="flex justify-center">
              <ConnectButton
                client={client}
                chain={polygon}
                connectModal={{
                  size: "compact",
                  title: "Sirius Verse",
                  welcomeScreen: {
                    title: "Bienvenido Sirius Verse",
                    subtitle: "Conecta tu wallet para continuar",
                  },
                }}
                connectButton={{
                  label: account ? "Conectado" : "Sirius Verse",
                  className: `
                    ${
                      account
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }
                    text-white 
                    px-4 py-2
                    text-sm
                    rounded-lg 
                    transition-colors
                    whitespace-nowrap
                    font-medium
                    min-w-[140px]
                    flex items-center justify-center
                  `,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
