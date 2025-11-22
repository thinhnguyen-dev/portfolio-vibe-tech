'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { FactCard } from './FactCard';

interface FactsGridProps {
  facts: string[];
  className?: string;
  maxWidth?: string;
  gap?: '2' | '3' | '4' | '6' | '8';
  variant?: 'default' | 'motion';
  variants?: Variants;
}

export const FactsGrid: React.FC<FactsGridProps> = ({
  facts,
  className = '',
  maxWidth = '605px',
  gap = '4',
  variant = 'default',
  variants,
}) => {
  // Group facts into rows (2 per row, last row can have 1)
  const rows: string[][] = [];
  for (let i = 0; i < facts.length; i += 2) {
    rows.push(facts.slice(i, i + 2));
  }

  const gapClasses = {
    '2': 'gap-2',
    '3': 'gap-3',
    '4': 'gap-4',
    '6': 'gap-6',
    '8': 'gap-8',
  };

  const gridContent = (
    <div
      className={`relative flex flex-col ${gapClasses[gap]} ${className}`}
      style={{ maxWidth }}
    >
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className={`flex flex-wrap ${gapClasses[gap]}`}>
          {row.map((fact, factIndex) => (
            <FactCard
              key={factIndex}
              text={fact}
              variant={variant}
              variants={variant === 'motion' ? variants : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );

  if (variant === 'motion' && variants) {
    return (
      <motion.div variants={variants}>
        {gridContent}
      </motion.div>
    );
  }

  return gridContent;
};

