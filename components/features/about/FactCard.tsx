'use client';

import React from 'react';
import { motion, Variants, TargetAndTransition } from 'framer-motion';

interface FactCardProps {
  text: string;
  className?: string;
  variant?: 'default' | 'motion';
  variants?: Variants;
  whileHover?: TargetAndTransition;
}

export const FactCard: React.FC<FactCardProps> = ({
  text,
  className = '',
  variant = 'default',
  variants,
  whileHover,
}) => {
  const cardClasses = `border border-text-secondary flex items-center px-2 py-2 relative ${className}`;
  
  const heroHoverAnimation = { 
    scale: 1.03,
    y: -5,
    transition: { duration: 0.4, type: "spring" as const, stiffness: 300, damping: 20 },
    boxShadow: "0 20px 20px -8px rgba(199, 120, 221, 0.2)",
  };

  const content = (
    <motion.div
      className={cardClasses}
      whileHover={heroHoverAnimation}
      style={{ 
        transformStyle: "preserve-3d",
        perspective: "1000px",
        willChange: "transform",
        cursor: "pointer"
      }}
    >
      <motion.div
        className="absolute inset-0 border border-text-secondary"
        whileHover={{
          boxShadow: "0 25px 50px -12px rgba(199, 120, 221, 0.2)",
          borderColor: "rgba(199, 120, 221, 0.4)",
          transition: { duration: 0.4 }
        }}
        style={{ 
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden"
        }}
      />
      <span className="relative z-10 text-text-secondary text-base leading-[21px]">
        {text}
      </span>
    </motion.div>
  );

  if (variant === 'motion') {
    return (
      <motion.div
        variants={variants}
        whileHover={whileHover || heroHoverAnimation}
        className={cardClasses}
        style={{ 
          transformStyle: "preserve-3d",
          perspective: "1000px",
          willChange: "transform",
          cursor: "pointer"
        }}
      >
        <motion.div
          className="absolute inset-0 border border-text-secondary"
          whileHover={{
            boxShadow: "0 25px 50px -12px rgba(199, 120, 221, 0.2)",
            borderColor: "rgba(199, 120, 221, 0.4)",
            transition: { duration: 0.4 }
          }}
          style={{ 
            willChange: "transform",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden"
          }}
        />
        <span className="relative z-10 text-text-secondary text-base leading-[21px]">
          {text}
        </span>
      </motion.div>
    );
  }

  return content;
};

