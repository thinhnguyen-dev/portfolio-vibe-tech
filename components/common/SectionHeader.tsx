'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

interface SectionHeaderProps {
  title: string;
  className?: string;
  showHash?: boolean;
  variant?: 'default' | 'motion';
  variants?: Variants;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  className = '',
  showHash = true,
  variant = 'default',
  variants,
}) => {
  const content = (
    <div className={`flex items-center mb-8 gap-4 max-w-full ${className}`}>
      {/* Title with hash */}
      <div className="flex items-center gap-0 h-[42px]">
        {showHash && (
          <span className="text-accent text-4xl leading-[42px] font-medium w-[20px]">
            #
          </span>
        )}
        <span className="text-foreground text-4xl leading-[42px] font-medium">
          {title}
        </span>
      </div>
      
      {/* Line */}
      <div className="bg-accent shrink-0 flex-1 h-px" />
    </div>
  );

  if (variant === 'motion' && variants) {
    return (
      <motion.div variants={variants}>
        {content}
      </motion.div>
    );
  }

  return content;
};

