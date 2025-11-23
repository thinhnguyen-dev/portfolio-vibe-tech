'use client';

import { Terminal } from './Terminal';
import { useTerminal } from './TerminalContext';

export const TerminalWrapper = () => {
  const { isOpen, closeTerminal } = useTerminal();
  return <Terminal isOpen={isOpen} onClose={closeTerminal} />;
};

