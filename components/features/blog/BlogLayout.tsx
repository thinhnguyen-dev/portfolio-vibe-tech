'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button, SectionHeader } from '@/components';
import { IoArrowBackCircle } from 'react-icons/io5';

interface BlogLayoutProps {
  title: string;
  description?: string;
  backLink?: {
    href: string;
    label: string;
  };
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function BlogLayout({
  title,
  description,
  backLink,
  children,
  headerAction,
}: BlogLayoutProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, amount: 0.1 });

  return (
    <div className='min-h-screen flex flex-col items-center'>
      <motion.div
        ref={headerRef}
        className="container px-12 sm:px-14 md:px-16 py-6 md:py-8 lg:py-8"
        variants={containerVariants}
        initial="hidden"
        animate={headerInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <motion.div className="mb-8" variants={itemVariants}>
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <SectionHeader
                  title={title}
                  variant="motion"
                  variants={itemVariants}
                />
              </div>
              {(backLink || headerAction) && (
                <motion.div 
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0 sm:pt-2 w-full sm:w-auto" 
                  variants={itemVariants}
                >
                  {backLink && (
                    <Button href={backLink.href} className="w-full sm:w-auto justify-center sm:justify-start mb-0 sm:mb-4">
                      {backLink.label}
                      <IoArrowBackCircle size={20} />
                    </Button>
                  )}
                  {headerAction && (
                    <div className="w-full sm:w-auto">
                      {headerAction}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
          {description && (
            <motion.p className="text-text-secondary" variants={itemVariants}>
              {description}
            </motion.p>
          )}
        </motion.div>
        {children}
      </motion.div>
    </div>
  );
}

