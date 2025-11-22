'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

interface SkillBlockProps {
  title: string;
  skills: string[][];
  className?: string;
  width?: string;
  variant?: 'default' | 'motion';
  variants?: Variants;
}

export const SkillBlock: React.FC<SkillBlockProps> = ({
  title,
  skills,
  className = '',
  width = '192px',
  variant = 'default',
  variants,
}) => {
  const blockContent = (
    <motion.div
      className={`border border-text-secondary flex flex-col gap-2 relative ${className}`}
      style={{ 
        width, 
        minWidth: width,
        transformStyle: "preserve-3d",
        perspective: "1000px",
        willChange: "transform",
        cursor: "pointer"
      } as React.CSSProperties}
      whileHover={{ 
        scale: 1.03,
        y: -5,
        transition: { duration: 0.4, type: "spring" as const, stiffness: 300, damping: 20 },
        boxShadow: "0 25px 50px -12px rgba(199, 120, 221, 0.2)",
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
      <div className="relative z-10 flex flex-col gap-2 w-full h-full">
      {/* Title Section */}
      <div className="pl-2 pt-2 h-[21px]">
        <h3 className="text-foreground text-base leading-[21px] font-medium">
          {title}
        </h3>
      </div>
      
      {/* Horizontal Line */}
      <div className="w-full h-px bg-text-secondary" />
      
      {/* Content Section */}
      <div className="pl-2 pb-2 flex flex-col gap-2">
        {skills.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-wrap gap-2">
            {row.map((skill, skillIndex) => (
              <span
                key={skillIndex}
                className="text-text-secondary text-base leading-[21px]"
              >
                {skill}
              </span>
            ))}
          </div>
        ))}
      </div>
      </div>
    </motion.div>
  );

  if (variant === 'motion' && variants) {
    return (
      <motion.div variants={variants}>
        {blockContent}
      </motion.div>
    );
  }

  return blockContent;
};

