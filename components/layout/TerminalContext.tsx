'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TerminalContextType {
  isOpen: boolean;
  openTerminal: () => void;
  closeTerminal: () => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export const TerminalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openTerminal = () => setIsOpen(true);
  const closeTerminal = () => setIsOpen(false);

  return (
    <TerminalContext.Provider value={{ isOpen, openTerminal, closeTerminal }}>
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminal = () => {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
};

