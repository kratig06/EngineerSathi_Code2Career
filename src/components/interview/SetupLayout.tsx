import React from 'react';

export function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100svh] w-full flex flex-col items-center overflow-x-hidden overflow-y-auto">
      {/* Blurred Background Layer - scaled slightly to avoid white edges from blur */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center scale-105"
        style={{ 
          backgroundImage: 'url(/images/interview-studio-two-chairs.webp)',
          filter: 'blur(8px)'
        }}
      />
      {/* Translucent navy/blue overlay for legibility */}
      <div className="fixed inset-0 z-0 bg-blue-950/60" />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/20 to-black/60" />

      {/* Foreground Content */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
        {children}
      </div>
    </div>
  );
}
