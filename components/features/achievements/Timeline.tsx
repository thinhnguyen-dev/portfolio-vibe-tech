'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';

export interface TimelineItem {
  date: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
  variant?: 'default' | 'motion';
  variants?: Variants;
  animateOnLoad?: boolean;
}

const timelineItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
    },
  },
};

export const Timeline: React.FC<TimelineProps> = ({
  items,
  className = '',
  variant = 'default',
  variants,
  animateOnLoad = false,
}) => {
  const timelineContent = (
    <div className={`relative ${className}`}>
      {/* Timeline vertical line - positioned at left side on desktop */}
      <div className="absolute left-[13px] lg:left-6 top-0 bottom-0 w-px bg-text-secondary/20 hidden md:block" />
      
      {/* Timeline items */}
      <div className="space-y-8 lg:space-y-12">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          // Always use variants system when variant is 'motion' and variants are provided
          // This ensures consistent animation behavior and items are always rendered
          const shouldUseVariants = variant === 'motion' && variants;
          
          return (
            <motion.div
              key={index}
              className="relative flex gap-4 lg:gap-8"
              {...(shouldUseVariants
                ? {
                    // When using parent variants, individual items inherit stagger from parent
                    // Always animate to visible to ensure items render even if parent hasn't triggered
                    variants: timelineItemVariants,
                    initial: "hidden",
                    animate: "visible",
                  }
                : variant === 'motion'
                ? {
                    initial: { opacity: 0, x: -20 },
                    whileInView: { opacity: 1, x: 0 },
                    viewport: { once: true, amount: "some" },
                    transition: { duration: 0.4, delay: index * 0.1 },
                  }
                : {})}
              whileHover={{ x: 4, transition: { duration: 0.2 } }}
            >
              {/* Timeline dot container */}
              <div className="relative z-10 flex-shrink-0">
                {/* Desktop timeline dot - centered on line */}
                <div className="w-6 h-6 lg:w-4 lg:h-4 rounded-full bg-accent border-2 border-accent hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
                  {/* Inner dot */}
                  <div className="w-2 h-2 rounded-full bg-background" />
                </div>
                
                {/* Mobile timeline dot */}
                <div className="w-4 h-4 rounded-full bg-accent border-2 border-background md:hidden" />
                
                {/* Connecting line segment (for desktop) - from dot to next dot */}
                {!isLast && (
                  <div className="absolute left-1/2 top-6 lg:top-4 -translate-x-1/2 w-px h-full bg-text-secondary/20 hidden md:block" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pb-8 lg:pb-12">
                {/* Date */}
                <div className="text-accent text-sm lg:text-base font-medium mb-2">
                  {item.date}
                </div>
                
                {/* Title */}
                <h3 className="text-foreground text-lg lg:text-xl font-medium mb-2">
                  {item.title}
                </h3>
                
                {/* Description */}
                <p className="text-text-secondary text-base leading-relaxed">
                  {item.description}
                </p>
                
                {/* Icon (if provided) */}
                {item.icon && (
                  <div className="mt-4 text-accent flex items-center gap-2">
                    {item.icon}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  if (variant === 'motion' && variants) {
    return (
      <motion.div 
        variants={variants}
        initial="hidden"
        animate={animateOnLoad ? "visible" : "visible"}
        whileInView="visible"
        viewport={{ once: true, amount: "some" }}
      >
        {timelineContent}
      </motion.div>
    );
  }

  return timelineContent;
};

