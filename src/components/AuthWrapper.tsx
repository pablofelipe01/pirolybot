// src/components/AuthWrapper.tsx
"use client";
import { useConnect } from "thirdweb/react";

type AuthWrapperProps = {
  children: React.ReactNode;
};

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isConnected } = useConnect();
  
  if (!isConnected) {
    return null;
  }
  
  return <>{children}</>;
}