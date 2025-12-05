'use client';

import React, { useState, useEffect } from 'react';

interface LoaderProps {
  onComplete: () => void;
  duration?: number; // in seconds
}

export default function Loader({ onComplete, duration = 5 }: LoaderProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Start fade out animation
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
              onComplete();
            }, 300); // Wait for fade out to complete
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm transition-opacity duration-300">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />
      
      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
        {/* Loader text with shimmer effect */}
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse">
            LOADING
          </h1>
        </div>

        {/* Spinner */}
        <div className="spinner w-12 h-12 sm:w-16 sm:h-16">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className="text-2xl font-mono text-amber-400 mb-2">
            {timeLeft}
          </div>
          <div className="text-sm text-neutral-400">
            Calculating your chances...
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${((duration - timeLeft) / duration) * 100}%` }}
          />
        </div>
      </div>

      {/* Custom CSS for spinner and animations */}
      <style jsx>{`
        .spinner {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 50%;
          perspective: 600px;
        }

        @media (min-width: 640px) {
          .spinner {
            width: 60px;
            height: 60px;
          }
          
          .spinner span {
            width: 35px;
            height: 7px;
            border-radius: 6px;
          }
          
          .spinner span:nth-child(1) { --left: 80px; }
          .spinner span:nth-child(2) { --left: 70px; }
          .spinner span:nth-child(3) { left: 60px; }
          .spinner span:nth-child(4) { left: 50px; }
          .spinner span:nth-child(5) { left: 40px; }
          .spinner span:nth-child(6) { left: 30px; }
          .spinner span:nth-child(7) { left: 20px; }
          .spinner span:nth-child(8) { left: 10px; }
        }

        .spinner span {
          position: absolute;
          top: 50%;
          left: var(--left);
          width: 28px;
          height: 6px;
          border-radius: 5px;

          /* Main metallic gold base */
          background: linear-gradient(
            90deg,
            #5a4a00 0%,
            #b88a00 20%,
            #d4af37 45%,
            #ffe88a 55%,
            #d4af37 70%,
            #b88a00 85%,
            #5a4a00 100%
          );
          background-size: 400% 400%;
          animation:
            dominos 1s ease infinite,
            goldShimmer 3.5s linear infinite;

          /* glow & shine */
          box-shadow:
            0 0 10px rgba(212, 175, 55, 0.6),
            inset 0 0 6px rgba(255, 240, 190, 0.3),
            0 0 25px rgba(212, 175, 55, 0.4);
          transform: rotateY(18deg);
        }

        .spinner span:nth-child(1) { --left: 64px; animation-delay: 0.125s; }
        .spinner span:nth-child(2) { --left: 56px; animation-delay: 0.3s; }
        .spinner span:nth-child(3) { left: 48px; animation-delay: 0.425s; }
        .spinner span:nth-child(4) { left: 40px; animation-delay: 0.54s; }
        .spinner span:nth-child(5) { left: 32px; animation-delay: 0.665s; }
        .spinner span:nth-child(6) { left: 24px; animation-delay: 0.79s; }
        .spinner span:nth-child(7) { left: 16px; animation-delay: 0.915s; }
        .spinner span:nth-child(8) { left: 8px; }

        @keyframes dominos {
          50% { opacity: 0.7; }
          75% { transform: rotateY(18deg) rotate(90deg); }
          80% { opacity: 1; }
        }

        @keyframes goldShimmer {
          0% {
            background-position: 0% 50%;
            filter: brightness(1) saturate(1.1);
          }
          25% {
            filter: brightness(1.3) saturate(1.3);
          }
          50% {
            background-position: 100% 50%;
            filter: brightness(1.45) saturate(1.4);
          }
          75% {
            filter: brightness(1.25) saturate(1.2);
          }
          100% {
            background-position: 0% 50%;
            filter: brightness(1) saturate(1.1);
          }
        }
      `}</style>
    </div>
  );
}
