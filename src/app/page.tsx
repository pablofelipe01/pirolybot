// src/app/page.tsx
"use client";

import { useActiveAccount } from 'thirdweb/react';
import { Header } from "@/components/Header";

export default function Home() {
  const account = useActiveAccount();

  return (
    <main>
      {/* {account && <Header />} */}
    </main>
  );
}