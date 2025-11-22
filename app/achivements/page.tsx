'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { SectionHeader } from '@/components/common';
import { Timeline, TimelineItem } from '@/components/features/achievements';
import { Contact } from '@/components/features/contact';
import { FaTrophy, FaMedal, FaAward, FaCertificate } from 'react-icons/fa';

// Animation variants for Achievements page
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

const timelineItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
    },
  },
};

export default function Achievements() {
  const achievementsRef = useRef<HTMLElement>(null);
  const certificationsRef = useRef<HTMLElement>(null);
  
  // Use viewport check - will trigger immediately if element is in view on mount
  const achievementsInView = useInView(achievementsRef, { once: true, amount: 0.1 });
  const certificationsInView = useInView(certificationsRef, { once: true, amount: 0.1 });

  // Achievements data in chronological order (oldest to newest)
  const achievements: TimelineItem[] = [
    {
      date: '2020',
      title: 'First Security Certification',
      description: 'Obtained CEH (Certified Ethical Hacker) certification, marking the beginning of my professional journey in cybersecurity and penetration testing.',
      icon: <FaCertificate size={20} />,
    },
    {
      date: '2021',
      title: 'OSCP Certification',
      description: 'Earned Offensive Security Certified Professional (OSCP) certification after successfully completing 24-hour practical penetration testing exam.',
      icon: <FaTrophy size={20} />,
    },
    {
      date: '2022',
      title: 'Critical Vulnerability Discovery',
      description: 'Responsibly disclosed a critical SQL injection vulnerability in a major web application, helping protect thousands of users.',
      icon: <FaMedal size={20} />,
    },
    {
      date: '2023',
      title: 'Security Researcher Recognition',
      description: 'Received recognition for outstanding security research and responsible disclosure practices at the annual cybersecurity conference.',
      icon: <FaAward size={20} />,
    },
    {
      date: '2024',
      title: 'CISSP Certification',
      description: 'Achieved Certified Information Systems Security Professional (CISSP) certification, demonstrating advanced expertise in security architecture and management.',
      icon: <FaTrophy size={20} />,
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center">
      {/* Achievements Hero Section */}
      <motion.section
        ref={achievementsRef}
        id="achievements"
        className="container px-12 sm:px-14 md:px-16 py-6 md:py-8 lg:py-8"
        variants={containerVariants}
        initial="hidden"
        animate={achievementsInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        {/* Section Header */}
        <SectionHeader
          title="achievements"
          variant="motion"
          variants={itemVariants}
        />

        {/* Timeline Section */}
        <motion.div
          className="max-w-4xl mt-8 lg:mt-12"
          variants={itemVariants}
        >
          <Timeline
            items={achievements}
            variant="motion"
            variants={containerVariants}
            animateOnLoad={achievementsInView}
          />
        </motion.div>
      </motion.section>

      {/* Additional Achievements Section (if needed) */}
      <motion.section
        ref={certificationsRef}
        className="container px-12 sm:px-14 md:px-16 lg:px-8 py-6 md:py-8 lg:py-8"
        variants={containerVariants}
        initial="hidden"
        animate={certificationsInView ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <SectionHeader
          title="certifications"
          variant="motion"
          variants={itemVariants}
        />

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
          variants={itemVariants}
        >
          {/* Certification Cards */}
          <motion.div
            className="border border-text-secondary p-6 hover:border-accent transition-colors"
            variants={timelineItemVariants}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <div className="text-accent mb-3">
              <FaCertificate size={32} />
            </div>
            <h3 className="text-foreground text-lg font-medium mb-2">
              CEH - Certified Ethical Hacker
            </h3>
            <p className="text-text-secondary text-sm mb-2">Issued: 2020</p>
            <p className="text-text-secondary text-base">
              Comprehensive ethical hacking certification covering penetration testing, vulnerability assessment, and security tools.
            </p>
          </motion.div>

          <motion.div
            className="border border-text-secondary p-6 hover:border-accent transition-colors"
            variants={timelineItemVariants}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <div className="text-accent mb-3">
              <FaTrophy size={32} />
            </div>
            <h3 className="text-foreground text-lg font-medium mb-2">
              OSCP - Offensive Security Certified Professional
            </h3>
            <p className="text-text-secondary text-sm mb-2">Issued: 2021</p>
            <p className="text-text-secondary text-base">
              Practical penetration testing certification covering advanced exploitation techniques and security methodologies.
            </p>
          </motion.div>

          <motion.div
            className="border border-text-secondary p-6 hover:border-accent transition-colors"
            variants={timelineItemVariants}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          >
            <div className="text-accent mb-3">
              <FaAward size={32} />
            </div>
            <h3 className="text-foreground text-lg font-medium mb-2">
              CISSP - Certified Information Systems Security Professional
            </h3>
            <p className="text-text-secondary text-sm mb-2">Issued: 2024</p>
            <p className="text-text-secondary text-base">
              Advanced security certification covering security architecture, risk management, and security operations.
            </p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Contact Section */}
      <Contact />
    </main>
  );
}

