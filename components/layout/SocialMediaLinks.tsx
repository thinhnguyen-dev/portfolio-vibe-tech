'use client';

import React from 'react';
import Link from 'next/link';
import { FaFacebook, FaGithub, FaInstagram } from 'react-icons/fa';

interface SocialIconProps {
  href: string;
  ariaLabel: string;
  children: React.ReactNode;
}

export const SocialIcon: React.FC<SocialIconProps> = ({ href, ariaLabel, children }) => {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
    >
      {children}
    </Link>
  );
};

export const SocialMediaLinks: React.FC = () => {
  return (
    <div className="fixed items-center justify-center left-0 top-1/2 -translate-y-1/2 z-50 hidden min-h-screen lg:flex flex-col">
      {/* Vertical line above social icons */}
      <div className="w-px flex-1 bg-text-secondary/10 mb-4">
      </div>
      
      {/* Social icons list */}
      <div className="flex flex-col gap-2 px-4">
        <SocialIcon href="https://facebook.com" ariaLabel="Facebook">
          <FaFacebook size={28} />
        </SocialIcon>

        <SocialIcon href="https://instagram.com" ariaLabel="Instagram">
          <FaInstagram size={28} />
        </SocialIcon>

        <SocialIcon href="https://github.com" ariaLabel="GitHub">
          <FaGithub size={28} />
        </SocialIcon>
      </div>
      
      {/* Vertical line below social icons */}
      <div className="w-px flex-1 bg-text-secondary/10 mt-4">
      </div>
    </div>
  );
};
