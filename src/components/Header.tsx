// src/components/Header.tsx
import Image from "next/image";

export function Header() {
  return (
    <header className="flex flex-col items-center mb-20">
      <div className="relative w-[150px] h-[150px]">
        <Image
          src="/logo.png" // Asegúrate de tener esta imagen en tu carpeta public
          alt="Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <h1 className="text-2xl md:text-6xl font-semibold md:font-bold tracking-tighter mb-6 text-zinc-100">
        SIRIUS
        <span className="text-zinc-300 inline-block mx-1"> + </span>
        <span className="inline-block -skew-x-6 text-blue-500"> VERSE </span>
      </h1>
    </header>
  );
}