'use client';

import { useEffect } from 'react';
import { Terminal } from './Terminal';
import { useTerminal } from './TerminalContext';

export const TerminalWrapper = () => {
  const { isOpen, closeTerminal, openTerminal } = useTerminal();

  // Auto-reopen terminal after reboot
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedState = sessionStorage.getItem('terminalState');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.shouldReopen && !isOpen) {
          // Small delay to ensure everything is mounted
          setTimeout(() => {
            openTerminal();
            // Clear the flag
            const updatedState = { ...state, shouldReopen: false };
            sessionStorage.setItem('terminalState', JSON.stringify(updatedState));
          }, 100);
        }
      }
    } catch {
      // Ignore errors
    }
  }, [isOpen, openTerminal]);

  return <Terminal isOpen={isOpen} onClose={closeTerminal} />;
};

