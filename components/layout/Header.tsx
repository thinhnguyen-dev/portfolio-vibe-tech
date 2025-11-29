'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Logo } from '../common/Logo';
import { NavLink } from '../common/NavLink';
import { ThemeSwitcher } from '../common/ThemeSwitcher';
import { Button } from '../common/Button';
import { useTerminal } from './TerminalContext';
import { IoMdHome } from 'react-icons/io';
import { FaCode, FaMedal } from 'react-icons/fa';
import { IoMdPerson } from 'react-icons/io';
import { MdArticle } from 'react-icons/md';

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { openTerminal } = useTerminal();

  const navItems = [
    { icon: <IoMdHome />, href: '/', label: 'home' },
    { icon: <IoMdPerson />, href: '/about', label: 'about' },
    { icon: <FaMedal />, href: '/achievements', label: 'achievements' },
    { icon: <MdArticle />, href: '/blog', label: 'blog' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-sm border-b border-text-secondary/10">
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-8 max-w-7xl">
        {/* Header content */}
        <div className="flex items-center justify-between pt-6 sm:pt-8 pb-6 sm:pb-8">
          {/* Left section: Logo + Name - width=72px from Figma, gap=8px */}
          <div className="flex items-center gap-2 h-[32px]">
            <div className="text-foreground shrink-0">
              <Logo />
            </div>
            <span className="text-foreground text-lg font-medium leading-[21px] whitespace-nowrap">
              Your Name
            </span>
          </div>

          {/* Right section: Navigation + Button + Theme Switcher - gap=32px from Figma */}
          <nav className="hidden md:flex items-center gap-4 md:gap-6 lg:gap-8 h-[32px]">
            {navItems.map((item) => {
              // Check if current pathname matches the nav item href
              // Handle root path ('/') separately to avoid matching all paths
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <div key={item.href} className="flex items-center gap-2">
                  {item.icon}
                  <NavLink
                    href={item.href}
                    label={item.label}
                    isActive={isActive}
                  />
                </div>
              );
            })}
            <ThemeSwitcher />
            <Button onClick={openTerminal}>
              Open terminal <span className="text-accent"><FaCode size={20} /></span>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-foreground hover:opacity-80 transition-opacity"
            aria-label="Toggle menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <nav className="md:hidden flex flex-col gap-4 pb-8 pt-4 border-t border-text-secondary/20">
            {navItems.map((item) => {
              // Check if current pathname matches the nav item href
              // Handle root path ('/') separately to avoid matching all paths
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  isActive={isActive}
                />
              );
            })}
            <div className="pt-2">
              <ThemeSwitcher />
            </div>
            <div className="pt-2">
              <Button onClick={openTerminal}>
                Open terminal <span className="text-accent"><FaCode size={20} /></span>
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
