'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/common';
import { FaHome, FaCode } from 'react-icons/fa';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-16">
      <div className="container max-w-4xl mx-auto text-center space-y-8 md:space-y-12">
        {/* 404 Number with Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          className="relative"
        >
          <h1 className="text-8xl sm:text-9xl md:text-[12rem] lg:text-[14rem] font-bold text-foreground leading-none">
            <span className="text-accent">4</span>
            <motion.span
              animate={{ 
                opacity: [1, 0.3, 1],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-block"
            >
              0
            </motion.span>
            <span className="text-accent">4</span>
          </h1>
        </motion.div>

        {/* Tech Illustration SVG */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center"
        >
          <svg
            width="300"
            height="200"
            viewBox="0 0 300 200"
            className="w-full max-w-md h-auto"
            xmlns="http://www.w3.org/2000/svg"
          >
            <style>{`
              @keyframes cursorBlink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
              }
              .cursor-blink {
                animation: cursorBlink 1s infinite;
              }
            `}</style>
            {/* Terminal Window */}
            <g>
              {/* Terminal Frame */}
              <rect
                x="20"
                y="30"
                width="260"
                height="140"
                rx="4"
                fill="none"
                stroke="rgb(199, 120, 221)"
                strokeWidth="2"
                opacity="0.6"
              />
              
              {/* Terminal Header */}
              <rect
                x="20"
                y="30"
                width="260"
                height="25"
                rx="4"
                fill="rgb(199, 120, 221)"
                fillOpacity="0.1"
              />
              
              {/* Terminal Dots */}
              <circle cx="35" cy="42.5" r="4" fill="rgb(199, 120, 221)" opacity="0.4" />
              <circle cx="50" cy="42.5" r="4" fill="rgb(199, 120, 221)" opacity="0.4" />
              <circle cx="65" cy="42.5" r="4" fill="rgb(199, 120, 221)" opacity="0.4" />
              
              {/* Terminal Text Lines */}
              <text
                x="30"
                y="70"
                fontFamily="monospace"
                fontSize="12"
                fill="rgb(171, 178, 191)"
                opacity="0.8"
              >
                $ page not found
              </text>
              
              <text
                x="30"
                y="95"
                fontFamily="monospace"
                fontSize="12"
                fill="rgb(199, 120, 221)"
                opacity="0.9"
              >
                {'>'} Error 404: Route undefined
              </text>
              
              <text
                x="30"
                y="120"
                fontFamily="monospace"
                fontSize="12"
                fill="rgb(171, 178, 191)"
                opacity="0.8"
              >
                {'>'} Status: Page not found
              </text>
              
              {/* Cursor Blink Animation */}
              <rect
                x="200"
                y="115"
                width="8"
                height="12"
                fill="rgb(199, 120, 221)"
                className="cursor-blink"
              />
              
              {/* Binary Code Background */}
              <g opacity="0.15">
                <text x="50" y="150" fontFamily="monospace" fontSize="10" fill="rgb(199, 120, 221)">
                  01001000
                </text>
                <text x="150" y="150" fontFamily="monospace" fontSize="10" fill="rgb(199, 120, 221)">
                  01000101
                </text>
                <text x="250" y="150" fontFamily="monospace" fontSize="10" fill="rgb(199, 120, 221)">
                  01001100
                </text>
                <text x="100" y="170" fontFamily="monospace" fontSize="10" fill="rgb(199, 120, 221)">
                  01001100
                </text>
                <text x="200" y="170" fontFamily="monospace" fontSize="10" fill="rgb(199, 120, 221)">
                  01001111
                </text>
              </g>
            </g>
          </svg>
        </motion.div>

        {/* Error Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Page Not Found
          </h2>
          <p className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed">
            The page you&apos;re looking for seems to have been moved, deleted, or doesn&apos;t exist.
            <br />
            Let&apos;s get you back on track.
          </p>
        </motion.div>

        {/* Navigation Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            href="/"
            className="group"
          >
            <FaHome className="transition-transform group-hover:translate-x-[-2px]" />
            Back to Homepage
          </Button>
        </motion.div>

        {/* Additional Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="pt-8"
        >
          <p className="text-sm text-text-secondary/70">
            If you believe this is an error, please{' '}
            <a
              href="/#contact"
              className="text-accent hover:underline transition-colors"
            >
              contact me
            </a>
            .
          </p>
        </motion.div>
      </div>
    </main>
  );
}

