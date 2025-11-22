'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

interface BioTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'motion';
  variants?: Variants;
}

export const BioText: React.FC<BioTextProps> = ({
  children,
  className = '',
  variant = 'default',
  variants,
}) => {
  const textClasses = `text-text-secondary text-base leading-relaxed ${className}`;

  if (variant === 'motion' && variants) {
    return (
      <motion.p className={textClasses} variants={variants}>
        {children}
      </motion.p>
    );
  }

  return <p className={textClasses}>{children}</p>;
};

