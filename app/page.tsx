'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Button, TypingText } from '@/components/common';
import { HeroLogo, DotsPattern, StatusBar, Quote } from '@/components/features/home';
import { Contact } from '@/components/features/contact';
import { FaCode } from 'react-icons/fa';

export default function Home() {
  const [showSubheading, setShowSubheading] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const heroLogoRef = useRef<HTMLDivElement>(null);
  const dotsPatternRef = useRef<HTMLDivElement>(null);
  
  // Use useInView to reliably detect when elements are in view, even on navigation
  // The hook will re-trigger on every component mount (navigation), but 'once: true' prevents re-animation while on the page
  const heroImageInView = useInView(heroImageRef, { once: true, amount: 0.1 });
  const heroLogoInView = useInView(heroLogoRef, { once: true, amount: 0.1 });
  const dotsPatternInView = useInView(dotsPatternRef, { once: true, amount: 0.1 });

  const handleHeadingComplete = () => {
    setShowSubheading(true);
  };

  const handleSubheadingComplete = () => {
    setShowButton(true);
  };

  return (
    <main className="min-h-screen">
      <section id="home" className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start lg:items-center min-h-[calc(100vh-200px)]">
          {/* Left Column - Text Content */}
          <div className="space-y-6 lg:space-y-8 order-1 lg:order-1 max-w-[537px]">
            {/* Main Heading - 537x84 from Figma */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-[1.1] min-h-[1.1em]">
              <TypingText
                text={[
                  { text: 'Yourname is a ' },
                  { text: 'pentester', isAccent: true },
                  { text: ' and ethical hacker' },
                ]}
                speed={30}
                delay={300}
                onComplete={handleHeadingComplete}
                showCursor={true}
              />
            </h1>
            
            {/* Subheading - 463x50 from Figma, gray color */}
            <p className="text-base md:text-lg text-text-secondary max-w-[463px] leading-relaxed min-h-[1.5em]">
              <AnimatePresence mode="wait">
                {showSubheading && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TypingText
                      text="I identifies vulnerabilities and strengthens security defenses through ethical hacking and penetration testing"
                      speed={40}
                      delay={200}
                      onComplete={handleSubheadingComplete}
                      showCursor={true}
                    />
                  </motion.span>
                )}
              </AnimatePresence>
            </p>
            
            {/* Button - 148x37 from Figma, itemSpacing: 10 */}
            <AnimatePresence>
              {showButton && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="pt-2"
                >
                  <Button href="">
                    Open terminal <span className="text-accent"><FaCode size={20} /></span>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Image with Decorative Elements */}
          <div className="relative order-2 lg:order-2 lg:justify-self-end w-full max-w-[469px]">
            {/* Hero Image Container */}
            <motion.div 
              ref={heroImageRef}
              className="relative w-full aspect-457/386 mx-auto lg:mx-0"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={heroImageInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ 
                duration: 0.6, 
                delay: 0.3,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              whileHover={{ 
                scale: 1.03,
                y: -5,
                transition: { duration: 0.4, type: "spring", stiffness: 300, damping: 20 }
              }}
              style={{ 
                transformStyle: "preserve-3d",
                perspective: "1000px"
              }}
            >
              {/* Placeholder for hero image - replace with actual image */}
              <motion.div 
                className="w-full h-full bg-linear-to-br from-accent/10 via-accent/5 to-background border border-text-secondary/20 flex items-center justify-center relative overflow-hidden rounded-sm cursor-pointer"
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
              >
                <motion.span 
                  className="text-text-secondary text-sm z-10"
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                >
                  Hero Image
                </motion.span>
              </motion.div>
              
              {/* Large Logo - 155x155, positioned at -12px left, 84px from top relative to image */}
              <motion.div 
                ref={heroLogoRef}
                className="absolute -left-12 lg:-left-16 top-20 hidden lg:block z-10"
                initial={{ opacity: 0, x: -20 }}
                animate={heroLogoInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ 
                  scale: 1.1,
                  rotate: -5,
                  transition: { duration: 0.3 }
                }}
              >
                <HeroLogo />
              </motion.div>
              
              {/* Dots Pattern - 84x84, positioned at bottom right */}
              <motion.div 
                ref={dotsPatternRef}
                className="absolute -right-8 lg:-right-12 bottom-16 lg:bottom-20 hidden lg:block z-10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={dotsPatternInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                whileHover={{ 
                  scale: 1.15,
                  rotate: 5,
                  transition: { duration: 0.3 }
                }}
              >
                <DotsPattern />
              </motion.div>
            </motion.div>
            
            {/* Status Bar - 402x37, positioned below image */}
            <div className="mt-6 lg:mt-8 lg:absolute lg:bottom-[-56px] lg:left-0">
              <StatusBar text="Currently working on" highlightText="Security Audit" highlightColor="text-accent" />
            </div>
          </div>
        </div>
      </section>
      
      {/* Quote Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex justify-center">
          <Quote 
            quote="The only truly secure system is one that is powered off, cast in a block of concrete and sealed in a lead-lined room with armed guards"
            author="- Gene Spafford"
          />
        </div>
      </section>

      {/* Contact Section */}
      <Contact />
    </main>
  );
}
