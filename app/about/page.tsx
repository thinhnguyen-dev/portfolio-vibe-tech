'use client';

import { SectionHeader } from '@/components/common';
import { BioText, FactsGrid, SkillBlock } from '@/components/features/about';
import { Contact } from '@/components/features/contact';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

// Animation variants for About page
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

export default function About() {
  const aboutRef = useRef(null);
  const skillsRef = useRef(null);
  const factsRef = useRef(null);
  
  const aboutInView = useInView(aboutRef, { initial: true, once: true, amount: "some" });
  const skillsInView = useInView(skillsRef, { once: true, amount: "some" });
  const factsInView = useInView(factsRef, { once: true, amount: "some" });

  return (
    <main className="min-h-screen flex flex-col items-center">
      {/* About Hero Section */}
      <motion.section
        ref={aboutRef}
        id="about"
        className="container px-12 sm:px-14 md:px-16 py-6 md:py-8 lg:py-8"
        variants={containerVariants}
        initial="hidden"
        animate={aboutInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: "some" }}
      >
        {/* Section Header */}
        <SectionHeader
          title="about-me"
          variant="motion"
          variants={itemVariants}
        />

        {/* Content Section */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16 items-start"
          variants={itemVariants}
        >
          {/* Left: Image */}
          <div className="relative w-full max-w-[500px] mx-auto lg:mx-0 order-1">
            <div className="relative w-full aspect-square">
              {/* Placeholder for about image */}
              <div className="w-full h-full bg-linear-to-br from-accent/10 via-accent/5 to-background border border-text-secondary/20 flex items-center justify-center relative overflow-hidden">
                <span className="text-text-secondary text-sm z-10">About Image</span>
              </div>
              
              {/* Decorative border frame */}
              <div className="absolute inset-0 border-2 border-accent/30 -z-10 translate-x-4 translate-y-4" />
            </div>
          </div>

          {/* Right: Bio Content */}
          <div className="space-y-6 order-2">
            <BioText variant="motion" variants={itemVariants}>
              Hello, I&apos;m Yourname!
            </BioText>
            
            <BioText variant="motion" variants={itemVariants}>
              I&apos;m a professional pentester and ethical hacker specializing in identifying security vulnerabilities, conducting penetration tests, and helping organizations strengthen their cyber defenses. I combine technical expertise with ethical principles to protect digital infrastructure.
            </BioText>
            
            <BioText variant="motion" variants={itemVariants}>
              With experience in vulnerability assessment, threat analysis, and security auditing, I help organizations identify and remediate security weaknesses before malicious actors can exploit them. I stay current with the latest attack vectors, security tools, and defense strategies to provide comprehensive security assessments.
            </BioText>
          </div>
        </motion.div>
      </motion.section>

      {/* Skills Section */}
      <motion.section
        ref={skillsRef}
        className="container px-12 sm:px-14 md:px-16 py-6 md:py-8 lg:py-8"
        variants={containerVariants}
        initial="hidden"
        animate={skillsInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: "some" }}
      >
        {/* Section Header */}
        <SectionHeader
          title="skills"
          variant="motion"
          variants={itemVariants}
        />

        {/* Skills Grid */}
        <motion.div
          className="flex flex-wrap gap-4"
          variants={itemVariants}
        >
          <SkillBlock
            title="Languages"
            skills={[['Python', 'Bash'], ['PowerShell', 'JavaScript']]}
            width="192px"
            variant="default"
          />
          
          <SkillBlock
            title="Tools"
            skills={[['Metasploit', 'Burp Suite'], ['Nmap', 'Wireshark']]}
            width="192px"
            variant="default"
          />
          
          <SkillBlock
            title="Domains"
            skills={[['OWASP', 'Vulnerability Assessment'], ['Network Security', 'Web App Security']]}
            width="192px"
            variant="default"
          />
        </motion.div>
      </motion.section>

      {/* Fun Facts Section */}
      <motion.section
        ref={factsRef}
        className="container px-12 sm:px-14 md:px-16 py-6 lg:py-8 relative"
        variants={containerVariants}
        initial="hidden"
        animate={factsInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: "some" }}
      >
        {/* Section Header */}
        <SectionHeader
          title="My facts"
          variant="motion"
          variants={itemVariants}
        />

        {/* Facts Container */}
        <div className="relative max-w-full">
          <FactsGrid
            facts={[
              'I started with cybersecurity in my early teens',
              'I enjoy participating in bug bounty programs',
              'I maintain multiple HackTheBox and TryHackMe certifications',
              'I contribute to security research and vulnerability disclosure',
              'My go-to scripting language is Python',
              'I participate in CTF competitions regularly',
              'I believe in responsible disclosure and ethical hacking',
            ]}
            maxWidth="605px"
            gap="4"
            variant="default"
          />
        </div>
      </motion.section>

      {/* Contact Section */}
      <Contact />
    </main>
  );
}

