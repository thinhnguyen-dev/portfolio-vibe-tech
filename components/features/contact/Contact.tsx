'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTelegram } from 'react-icons/fa';
import { IoIosMail } from 'react-icons/io';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
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
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.3,
    },
  },
};

const lineVariants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: {
      duration: 0.6,
    },
  },
  exit: {
    opacity: 0,
    scaleX: 0,
    transition: {
      duration: 0.3,
    },
  },
};

const contactItemVariants = {
  hidden: { opacity: 0, x: 10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.2,
    },
  },
};

export const Contact: React.FC = () => {
  return (
    <AnimatePresence mode="wait">
      <motion.section
        id="contact"
        className="container px-12 sm:px-14 md:px-16 py-6 md:py-8 lg:py-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        exit="exit"
      >
        <div className="w-full">
          {/* Section Header */}
          <motion.div
            className="flex items-center mb-4 gap-[16px] max-w-full h-[42px]"
            variants={itemVariants}
          >
            {/* Title with hash */}
            <motion.div
              className="flex items-center gap-0 w-[174px] h-[42px]"
              variants={headerVariants}
            >
              <span className="text-accent text-4xl leading-[42px] font-medium w-[20px]">
                #
              </span>
              <span className="text-foreground text-4xl leading-[42px] font-medium w-[154px]">
                contact
              </span>
            </motion.div>

            <motion.div
              className="bg-accent shrink-0 flex-1 h-px origin-left"
              variants={lineVariants}
            />
          </motion.div>

          {/* Content - Two column layout */}
          <motion.div
            className="flex flex-col md:flex-row gap-6 md:gap-8 w-full md:justify-between"
            variants={itemVariants}
          >
            {/* Left: Description */}
            <motion.div
              className="w-full md:w-[450px] lg:w-[505px] max-w-full min-h-[63px]"
              variants={itemVariants}
            >
              <p className="text-text-secondary text-base leading-relaxed">
                I&apos;m interested in freelance opportunities. However, if you have other request or question, don&apos;t hesitate to contact me
              </p>
            </motion.div>

            {/* Right: Contact Box */}
            <motion.div
              className="border border-text-secondary flex flex-col w-full md:w-[280px] lg:w-[300px] h-[141px] max-w-full relative"
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03,
                y: -5,
                transition: { duration: 0.4, type: "spring" as const, stiffness: 300, damping: 20 },
                boxShadow: "0 25px 50px -12px rgba(199, 120, 221, 0.2)",
              }}
              style={{ 
                transformStyle: "preserve-3d",
                perspective: "1000px",
                willChange: "transform",
                cursor: "pointer"
              }}
            >
              <motion.div
                className="absolute inset-0 border border-text-secondary pointer-events-none"
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
              <div className="relative z-10 flex flex-col w-full h-full">
              {/* Message me here */}
              <motion.div
                className="pl-4 pt-4"
                variants={itemVariants}
              >
                <p className="text-foreground text-base leading-[21px] font-medium w-[144px]">
                  Message me here
                </p>
              </motion.div>

              {/* Contact Details */}
              <motion.div
                className="flex flex-col ml-4 mt-4 gap-2"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {/* Telegram */}
                <motion.div
                  className="flex items-center h-8 gap-1"
                  variants={contactItemVariants}
                  whileHover={{ x: 5, transition: { duration: 0.2 } }}
                >
                  <FaTelegram size={28} className="text-text-secondary" />
                  <span className="text-text-secondary text-base leading-[21px] w-[106px]">
                    @yourname
                  </span>
                </motion.div>

                {/* Email */}
                <motion.div
                  className="flex items-center h-8 gap-1"
                  variants={contactItemVariants}
                  whileHover={{ x: 5, transition: { duration: 0.2 } }}
                >
                  <IoIosMail size={28} className="text-text-secondary" />
                  <span className="text-text-secondary text-base leading-[21px] w-[135px]">
                    yourname@yourname.me
                  </span>
                </motion.div>
              </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
};
