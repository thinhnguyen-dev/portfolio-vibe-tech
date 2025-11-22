'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowUp } from 'react-icons/fa';

export const GoToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when user scrolls down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Listen for scroll events
    window.addEventListener('scroll', toggleVisibility);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, type: 'spring' as const, stiffness: 300, damping: 20 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-50 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-accent bg-background text-foreground hover:bg-accent/10 transition-colors rounded-sm cursor-pointer shadow-lg"
          aria-label="Go to top"
          whileHover={{
            scale: 1.1,
            y: -5,
            boxShadow: '0 25px 50px -12px rgba(199, 120, 221, 0.2)',
            borderColor: 'rgba(199, 120, 221, 0.4)',
            transition: { duration: 0.4, type: 'spring' as const, stiffness: 300, damping: 20 }
          }}
          style={{
            transformStyle: 'preserve-3d',
            perspective: '1000px',
            willChange: 'transform'
          }}
        >
          <motion.div
            whileHover={{
              y: -2,
              transition: { duration: 0.2 }
            }}
          >
            <FaArrowUp className="text-accent w-4 h-4 sm:w-5 sm:h-5" />
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

