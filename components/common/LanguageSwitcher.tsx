'use client';

import React, { useState, useRef, useEffect } from 'react';

type Language = 'EN' | 'RU' | 'UA';

export const LanguageSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<Language>('EN');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages: Language[] = ['EN', 'RU', 'UA'];

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    setIsOpen(false);
    // Add your language switching logic here
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 hover:opacity-80 transition-opacity text-base leading-[21px]"
        aria-label="Language switcher"
        aria-expanded={isOpen}
      >
        <span className="text-text-secondary">{currentLang}</span>
        <svg
          width="10"
          height="5"
          viewBox="0 0 10 5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''} text-text-secondary`}
        >
          {/* Chevron down arrow - two diagonal lines */}
          <line
            x1="0"
            y1="0"
            x2="5"
            y2="5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="5"
            y1="5"
            x2="10"
            y2="0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-6 left-0 min-w-[36px] bg-background border border-text-secondary z-50">
          <div className="flex flex-col">
            {languages
              .filter((lang) => lang !== currentLang)
              .map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className="px-2 py-2 text-left text-base text-text-secondary hover:text-foreground transition-colors"
                >
                  {lang}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
