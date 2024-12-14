// src/components/Header.tsx
import Image from "next/image";

export function Header() {
  return (
    <div className="relative w-full min-h-screen">
      {/* Video de fondo */}
      <video 
        autoPlay 
        loop 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/video1.mp4" type="video/mp4" />
      </video>

      {/* Capa de opacidad */}
      <div className="absolute inset-0 bg-black opacity-50"></div>

      {/* Contenido del header */}
      <header className="relative z-10 flex flex-col items-center justify-center min-h-screen">
        <div className="relative w-[150px] h-[150px]">
          <Image
            src="/logo.png"
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
    </div>
  );
}