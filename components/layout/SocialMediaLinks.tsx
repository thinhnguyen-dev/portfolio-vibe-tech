'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IoMdHome } from 'react-icons/io';
import { IoMdPerson } from 'react-icons/io';
import { FaMedal } from 'react-icons/fa';

interface SocialIconProps {
  href: string;
  ariaLabel: string;
  children: React.ReactNode;
}

// Keep SocialIcon for backward compatibility (used in Footer)
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
  const pathname = usePathname();

  const navItems = [
    { icon: IoMdHome, href: '/', label: 'home' },
    { icon: IoMdPerson, href: '/about', label: 'about' },
    { icon: FaMedal, href: '/achievements', label: 'achievements' },
  ];

  return (
    <div className="fixed items-center justify-center left-0 top-1/2 -translate-y-1/2 z-50 hidden md:flex min-h-screen flex-col">
      {/* Vertical line above navigation links */}
      <div className="w-px flex-1 bg-text-secondary/10 mb-4">
      </div>
      
      {/* Navigation links list */}
      <div className="flex flex-col gap-2 px-4">
        {navItems.map((item) => {
          // Check if current pathname matches the nav item href
          // Handle root path ('/') separately to avoid matching all paths
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center w-10 h-10 rounded-sm transition-all duration-200 group border-accent ${
                isActive 
                  ? 'text-foreground bg-accent/10 border-l-2' 
                  : 'text-text-secondary hover:text-foreground hover:bg-text-secondary/5'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={`transition-colors duration-200 ${isActive ? 'text-accent' : 'text-text-secondary group-hover:text-accent'}`}>
                <item.icon size={28} />
              </span>
            </Link>
          );
        })}
      </div>
      
      {/* Vertical line below navigation links */}
      <div className="w-px flex-1 bg-text-secondary/10 mt-4">
      </div>
    </div>
  );
};
