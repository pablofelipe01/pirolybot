"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { client } from "@/app/client";
import { polygon } from "@/app/chain";
import { Navbar } from "@/components/Navbar";

export function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThirdwebProvider client={client} activeChain={polygon}>
      <Navbar />
      <div className="pt-16">
        {children}
      </div>
    </ThirdwebProvider>
  );
}