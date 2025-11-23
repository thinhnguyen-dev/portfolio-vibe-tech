'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Button, TypingText } from '@/components/common';
import { HeroLogo, DotsPattern, StatusBar, Quote } from '@/components/features/home';
import { Contact } from '@/components/features/contact';
import { useTerminal } from '@/components/layout';
import { FaCode } from 'react-icons/fa';

// Define 3 sentences for the main heading
const headingSentences = [
  [
    { text: 'Yourname is a ' },
    { text: 'pentester', isAccent: true },
    { text: ' and ethical hacker' },
  ],
  [
    { text: 'Specializing in ' },
    { text: 'vulnerability assessment', isAccent: true },
    { text: ' and security testing' },
  ],
  [
    { text: 'Building ' },
    { text: 'secure systems', isAccent: true },
    { text: ' through ethical hacking' },
  ],
];

export default function Home() {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [showCurrentSentence, setShowCurrentSentence] = useState(true);
  const [firstCycleComplete, setFirstCycleComplete] = useState(false);
  const [showSubheading, setShowSubheading] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const heroLogoRef = useRef<HTMLDivElement>(null);
  const dotsPatternRef = useRef<HTMLDivElement>(null);
  const { openTerminal } = useTerminal();
  
  // Use useInView to reliably detect when elements are in view, even on navigation
  // The hook will re-trigger on every component mount (navigation), but 'once: true' prevents re-animation while on the page
  const heroImageInView = useInView(heroImageRef, { once: true, amount: 0.1 });
  const heroLogoInView = useInView(heroLogoRef, { once: true, amount: 0.1 });
  const dotsPatternInView = useInView(dotsPatternRef, { once: true, amount: 0.1 });

  const handleTypingComplete = () => {
    // Show subheading when first sentence completes typing (before backspacing starts)
    if (currentSentenceIndex === 0 && !firstCycleComplete) {
      setFirstCycleComplete(true);
      setShowSubheading(true);
      // Show button after subheading appears
      setTimeout(() => {
        setShowButton(true);
      }, 500);
    }
  };

  const handleHeadingComplete = () => {
    // Move to next sentence after backspace completes
    // Small delay to ensure smooth transition
    setTimeout(() => {
      const nextIndex = (currentSentenceIndex + 1) % headingSentences.length;
      setCurrentSentenceIndex(nextIndex);
      // Reset showCurrentSentence to trigger re-mount with new sentence
      setShowCurrentSentence(false);
      setTimeout(() => {
        setShowCurrentSentence(true);
      }, 50);
    }, 100);
  };

  return (
    <main className="min-h-screen flex flex-col items-center">
      <section id="home" className="container px-12 sm:px-14 md:px-16 py-6 md:py-8 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 items-start lg:items-center min-h-[calc(100vh-200px)]">
          {/* Left Column - Text Content */}
          <div className="space-y-6 lg:space-y-8 order-1 lg:order-1">
            {/* Main Heading */}
            <h1 className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-[46px] font-bold text-foreground leading-[1.1] min-h-[1.1em]">
              <AnimatePresence mode="wait">
                {showCurrentSentence && (
                  <motion.span
                    key={currentSentenceIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TypingText
                      text={headingSentences[currentSentenceIndex]}
                      speed={30}
                      delay={300}
                      onTypingComplete={handleTypingComplete}
                      onComplete={handleHeadingComplete}
                      showCursor={true}
                      backspace={true}
                      backspaceSpeed={20}
                      backspaceDelay={1500}
                    />
                  </motion.span>
                )}
              </AnimatePresence>
            </h1>
            
            {/* Subheading - 463x50 from Figma, gray color */}
            <p className="text-base md:text-lg text-text-secondary max-w-[463px] leading-relaxed min-h-[1.5em]">
              <AnimatePresence>
                {showSubheading && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    I identifies vulnerabilities and strengthens security defenses through ethical hacking and penetration testing
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
                  <Button onClick={openTerminal}>
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
                className="absolute -left-10 lg:-left-16 top-20 hidden lg:block z-10"
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
      <section className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-8 py-6 md:py-8 lg:py-8">
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
