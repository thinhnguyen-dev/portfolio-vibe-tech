'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IoChevronDown } from 'react-icons/io5';

interface LanguageSelectorProps {
  value: 'vi' | 'en';
  onChange: (language: 'vi' | 'en') => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  showRequired?: boolean;
  helpText?: string;
  className?: string;
  selectClassName?: string;
}

const languages = [
  { value: 'vi' as const, label: 'Vietnamese (vi)', flag: '/vietnamese-flag.svg' },
  { value: 'en' as const, label: 'English (en)', flag: '/uk-flag.svg' },
];

export function LanguageSelector({
  value,
  onChange,
  disabled = false,
  id = 'language-select',
  label = 'Language',
  showRequired = true,
  helpText,
  className = '',
  selectClassName = '',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const selectedLanguage = languages.find((lang) => lang.value === value) || languages[0];

  const handleSelect = (language: 'vi' | 'en') => {
    onChange(language);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const defaultSelectClassName = 'w-60 px-4 py-2 border border-text-secondary/20 rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-between';
  
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium mb-2 text-foreground">
        {label} {showRequired && <span className="text-text-secondary text-xs">(required)</span>}
      </label>
      <div className="relative">
        <button
          ref={buttonRef}
          id={id}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={selectClassName || defaultSelectClassName}
        >
          <div className="flex items-center gap-2">
            <img
              src={selectedLanguage.flag}
              alt={`${selectedLanguage.value} flag`}
              className="w-5 h-5 object-contain rounded-sm"
            />
            <span>{selectedLanguage.label}</span>
          </div>
          <IoChevronDown className="ml-2 w-4 h-4 text-text-secondary" />
        </button>

        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute z-50 w-60 mt-1 bg-background border border-text-secondary/20 rounded-md shadow-lg overflow-hidden"
              role="listbox"
            >
              {languages.map((language) => (
                <motion.button
                  key={language.value}
                  type="button"
                  onClick={() => handleSelect(language.value)}
                  className={`w-full text-left px-4 py-2 text-sm text-foreground transition-colors ${
                    value === language.value
                      ? 'bg-accent/20 text-accent font-medium'
                      : 'hover:bg-text-secondary/10'
                  }`}
                  role="option"
                  aria-selected={value === language.value}
                  whileHover={{ backgroundColor: value === language.value ? 'rgba(199, 120, 221, 0.2)' : 'rgba(255, 255, 255, 0.05)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={language.flag}
                      alt={`${language.value} flag`}
                      className="w-5 h-5 object-contain rounded-sm"
                    />
                    <span>{language.label}</span>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {helpText && (
        <p className="mt-1 text-xs text-text-secondary">
          {helpText}
        </p>
      )}
    </div>
  );
}

