'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface QuoteProps {
  quote: string;
  author: string;
  className?: string;
}

export const Quote: React.FC<QuoteProps> = ({ quote, author, className = '' }) => {
  return (
    <motion.div 
      className={`relative bg-background border border-text-secondary w-full max-w-[712px] mx-auto px-4 sm:px-8 min-h-[95px] ${className}`}
      whileHover={{ 
        scale: 1.03,
        y: -5,
        transition: { duration: 0.4, type: "spring" as const, stiffness: 300, damping: 20 },
        boxShadow: "0 25px 50px -12px rgba(199, 120, 221, 0.2)",
      }}
      style={{ 
        transformStyle: "preserve-3d",
        perspective: "1000px",
        willChange: "transform",
        cursor: "pointer"
      }}
    >
      <motion.div
        whileHover={{
          borderColor: "rgba(199, 120, 221, 0.4)",
          transition: { duration: 0.4 }
        }}
        style={{ 
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden"
        }}
        className="relative w-full h-full"
      >
      {/* Left quote mark - positioned at top left */}
      <div 
        className="absolute left-2 sm:left-[11px] top-[-14px] bg-background flex items-center justify-center z-10 px-1"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-text-secondary"
        >
          {/* Left opening quote mark - curved quote */}
          <text
            x="50%"
            y="90%"
            dominantBaseline="middle"
            textAnchor="middle"
            fontSize="50"
            fill="currentColor"
            fontFamily="serif"
          >
            &ldquo;
          </text>
        </svg>
      </div>

      {/* Quote text - responsive with proper padding and wrapping */}
      <div 
        className="relative text-foreground pt-4 sm:pt-8 pr-8 sm:pr-24 pb-4 sm:pb-6"
      >
        <p className="text-lg sm:text-2xl leading-relaxed sm:leading-[31px] font-medium">
          {quote}
        </p>
      </div>

      {/* Author frame - responsive positioning */}
      <div 
        className="flex items-center w-full sm:w-[162px] h-auto sm:h-[63px] min-h-[50px] sm:min-h-[63px] justify-center sm:justify-start"
      >
        <p className="text-foreground text-sm sm:text-base leading-relaxed sm:leading-[21px] font-medium text-center sm:text-left">
          {author}
        </p>
      </div>
      </motion.div>
    </motion.div>
  );
};
