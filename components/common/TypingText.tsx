'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TextPart {
  text: string;
  isAccent?: boolean;
}

interface TypingTextProps {
  text: string | TextPart[];
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  onTypingComplete?: () => void;
  className?: string;
  showCursor?: boolean;
  cursorChar?: string;
  backspace?: boolean;
  backspaceSpeed?: number;
  backspaceDelay?: number;
}

export const TypingText: React.FC<TypingTextProps> = ({
  text,
  speed = 50,
  delay = 0,
  onComplete,
  onTypingComplete,
  className = '',
  showCursor = true,
  cursorChar = '|',
  backspace = false,
  backspaceSpeed,
  backspaceDelay = 500,
}) => {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isBackspacing, setIsBackspacing] = useState(false);
  
  // Use backspaceSpeed if provided, otherwise use typing speed
  const effectiveBackspaceSpeed = backspaceSpeed ?? speed;

  // Reset when text changes
  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setDisplayedLength(0);
      setIsComplete(false);
      setIsBackspacing(false);
    });
    
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(text)]);

  // Parse text into parts
  const parseText = (): TextPart[] => {
    if (Array.isArray(text)) {
      return text;
    }
    
    // For string, return as single part
    return [{ text }];
  };

  const parts = parseText();
  const totalLength = parts.reduce((sum, part) => sum + part.text.length, 0);

  useEffect(() => {
    // Handle typing completion - start backspacing if enabled
    if (displayedLength >= totalLength && !isComplete && totalLength > 0 && !isBackspacing) {
      // Call onTypingComplete callback when typing finishes (before backspacing)
      if (onTypingComplete) {
        setTimeout(() => onTypingComplete(), 0);
      }
      
      if (backspace) {
        // Wait for backspaceDelay before starting backspace
        const backspaceTimeout = setTimeout(() => {
          setIsBackspacing(true);
        }, backspaceDelay);
        return () => clearTimeout(backspaceTimeout);
      } else {
        // Normal completion without backspace
        const rafId = requestAnimationFrame(() => {
          setIsComplete(true);
          if (onComplete) {
            setTimeout(() => onComplete(), 0);
          }
        });
        return () => cancelAnimationFrame(rafId);
      }
    }

    // Handle backspace completion
    if (backspace && isBackspacing && displayedLength === 0 && !isComplete && totalLength > 0) {
      const rafId = requestAnimationFrame(() => {
        setIsComplete(true);
        setIsBackspacing(false);
        if (onComplete) {
          setTimeout(() => onComplete(), 0);
        }
      });
      return () => cancelAnimationFrame(rafId);
    }

    // Backspacing: decrease displayed length
    if (backspace && isBackspacing && displayedLength > 0) {
      const timeoutId = setTimeout(() => {
        setDisplayedLength((prev) => prev - 1);
      }, effectiveBackspaceSpeed);
      return () => clearTimeout(timeoutId);
    }

    // Start typing after delay
    if (displayedLength === 0 && totalLength > 0 && !isBackspacing) {
      const initialTimeout = setTimeout(() => {
        setDisplayedLength(1);
      }, delay);
      return () => clearTimeout(initialTimeout);
    }

    // Continue typing
    if (displayedLength > 0 && displayedLength < totalLength && !isBackspacing) {
      const timeoutId = setTimeout(() => {
        setDisplayedLength((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeoutId);
    }
  }, [displayedLength, totalLength, speed, delay, onComplete, onTypingComplete, isComplete, backspace, isBackspacing, backspaceDelay, effectiveBackspaceSpeed]);

  // Render the text based on displayed length
  const renderText = () => {
    let remainingChars = displayedLength;

    return parts.map((part, partIndex) => {
      const partLength = part.text.length;
      const charsToShow = Math.max(0, Math.min(partLength, remainingChars));
      const partText = part.text.substring(0, charsToShow);
      remainingChars -= charsToShow;

      if (part.isAccent) {
        return (
          <span key={partIndex} className="text-accent">
            {partText}
          </span>
        );
      }
      return <React.Fragment key={partIndex}>{partText}</React.Fragment>;
    });
  };

  return (
    <span className={className}>
      {renderText()}
      {showCursor && (!isComplete || (backspace && isBackspacing)) && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatDelay: 0,
            ease: 'easeInOut',
          }}
          className="inline-block ml-0.5 text-accent"
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  );
};