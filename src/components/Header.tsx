// src/components/Header.tsx
import Image from "next/image";
import Link from "next/link";

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
        
        <Link 
          href="/multimodal"
          className="mt-8 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
                   transition-all duration-300 transform hover:scale-105
                   text-lg font-medium shadow-lg hover:shadow-xl
                   flex items-center gap-2"
        >
          Explorar Multimodal
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </Link>
      </header>
    </div>
  );
}