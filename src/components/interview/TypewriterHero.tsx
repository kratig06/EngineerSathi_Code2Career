'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

const PHRASES = [
  "Prepare for your next Software Engineer interview",
  "Master DSA and coding challenges",
  "Practice technical interviews with AI",
  "Get ready for your HR interview",
  "Improve your aptitude and logical reasoning",
  "Build confidence before interview day",
  "Practice company-specific interview questions"
];

export function TypewriterDisplay() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Prevent hydration mismatch by only animating on client
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCharIndex(PHRASES[0].length);
      return;
    }

    const currentPhrase = PHRASES[phraseIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && charIndex === currentPhrase.length) {
      // Pause at the end of the phrase
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && charIndex === 0) {
      // Move to next phrase after deleting
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
    } else {
      // Typing or deleting characters
      const delay = isDeleting ? 30 : 60; // Faster delete, slower type
      timeout = setTimeout(() => {
        setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
      }, delay);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex, isClient]);

  const displayText = isClient ? PHRASES[phraseIndex].substring(0, charIndex) : PHRASES[0];

  return (
    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center min-h-[56px] shadow-inner transition-colors group">
      <Sparkles className="w-5 h-5 text-primary/70 mr-3 flex-shrink-0" />
      <span className="text-white/90 font-medium whitespace-nowrap overflow-hidden text-sm md:text-base h-[1.5rem] flex items-center">
        {displayText}
        {isClient && (
          <span className="inline-block w-0.5 h-4 bg-primary ml-1 animate-pulse" />
        )}
      </span>
    </div>
  );
}
