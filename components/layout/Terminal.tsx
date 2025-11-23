'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';

type Theme = 'light' | 'dark';

interface CommandOutput {
  type: 'command' | 'output' | 'error';
  content: string | string[];
}

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isMinimized: boolean;
}

type ResizeDirection = 
  | 'top' 
  | 'right' 
  | 'bottom' 
  | 'left' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right' 
  | null;

const MIN_WIDTH = 600;
const MIN_HEIGHT = 400;
const MIN_WIDTH_MOBILE = 320;
const MIN_HEIGHT_MOBILE = 300;
const INITIAL_WIDTH = 800;
const INITIAL_HEIGHT = 500;
const RESIZE_HANDLE_SIZE = 8;
const EDGE_HANDLE_SIZE = 4;
const MAX_HISTORY_LINES = 100;

export const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const pathname = usePathname();
  
  // Check if mobile device - reactive to window resize
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  
  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate initial size based on screen size
  const getInitialSize = () => {
    if (typeof window === 'undefined') {
      return { width: INITIAL_WIDTH, height: INITIAL_HEIGHT, x: 0, y: 0 };
    }
    
    if (isMobile) {
      // On mobile, use nearly fullscreen with small margins
      const margin = 8;
      return {
        width: window.innerWidth - margin * 2,
        height: window.innerHeight - margin * 2,
        x: margin,
        y: margin,
      };
    }
    
    // On desktop, center the window
    return {
      width: INITIAL_WIDTH,
      height: INITIAL_HEIGHT,
      x: window.innerWidth / 2 - INITIAL_WIDTH / 2,
      y: window.innerHeight / 2 - INITIAL_HEIGHT / 2,
    };
  };
  
  const initialSize = getInitialSize();
  
  const [windowState, setWindowState] = useState<WindowState>({
    x: initialSize.x,
    y: initialSize.y,
    width: initialSize.width,
    height: initialSize.height,
    isMaximized: false,
    isMinimized: false,
  });

  const [theme, setTheme] = useState<Theme>('dark');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ 
    x: 0, 
    y: 0, 
    width: 0, 
    height: 0, 
    startX: 0, 
    startY: 0 
  });

  // Command line state
  const [commandHistory, setCommandHistory] = useState<CommandOutput[]>([
    { type: 'output', content: 'Welcome to the terminal. Type "help" to see available commands.' }
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistoryList, setCommandHistoryList] = useState<string[]>([]);
  const [tabSuggestions, setTabSuggestions] = useState<string[]>([]);
  const [tabSuggestionIndex, setTabSuggestionIndex] = useState(-1);
  const [lastTabPress, setLastTabPress] = useState<number>(0);

  const terminalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync with website theme
  useEffect(() => {
    const getTheme = (): Theme => {
      if (typeof window === 'undefined') return 'dark';
      return document.documentElement.classList.contains('light') ? 'light' : 'dark';
    };

    // Set initial theme using requestAnimationFrame to avoid synchronous setState
    const rafId = requestAnimationFrame(() => {
      setTheme(getTheme());
    });

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const newTheme = getTheme();
      requestAnimationFrame(() => {
        setTheme(newTheme);
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Also listen to storage changes (when theme is changed in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        requestAnimationFrame(() => {
          setTheme((e.newValue as Theme) || 'dark');
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle window resize to keep terminal within bounds
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowResize = () => {
      if (windowState.isMaximized) {
        setWindowState(prev => ({
          ...prev,
          width: window.innerWidth,
          height: window.innerHeight,
        }));
      } else {
        setWindowState(prev => ({
          ...prev,
          x: Math.min(prev.x, Math.max(0, window.innerWidth - prev.width)),
          y: Math.min(prev.y, Math.max(0, window.innerHeight - prev.height)),
          width: Math.min(prev.width, window.innerWidth),
          height: Math.min(prev.height, window.innerHeight),
        }));
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isOpen, windowState.isMaximized]);

  // Handle smooth dragging with requestAnimationFrame
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (windowState.isMaximized || windowState.isMinimized) return;
    
    // Don't start dragging if clicking on buttons or resize handles
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[data-resize-handle]')) return;
    
    if (headerRef.current?.contains(e.target as Node)) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - windowState.x,
        y: e.clientY - windowState.y,
      });
    }
  }, [windowState]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (windowState.isMaximized) return;

      // Use requestAnimationFrame for smooth dragging
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        let newX = clientX - dragStart.x;
        let newY = clientY - dragStart.y;

        // Keep window within bounds
        newX = Math.max(0, Math.min(newX, window.innerWidth - windowState.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - windowState.height));

        setWindowState(prev => ({ ...prev, x: newX, y: newY }));
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDragging, dragStart, windowState.width, windowState.height, windowState.isMaximized]);

  // Handle resizing with full direction support
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, direction: ResizeDirection) => {
    if (windowState.isMaximized || windowState.isMinimized || isMobile) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: windowState.width,
      height: windowState.height,
      startX: windowState.x,
      startY: windowState.y,
    });
  }, [windowState, isMobile]);

  useEffect(() => {
    if (!isResizing || !resizeDirection) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (windowState.isMaximized) return;

      // Use requestAnimationFrame for smooth resizing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.startX;
        let newY = resizeStart.startY;

        // Use mobile or desktop minimums
        const minWidth = isMobile ? MIN_WIDTH_MOBILE : MIN_WIDTH;
        const minHeight = isMobile ? MIN_HEIGHT_MOBILE : MIN_HEIGHT;

        // Handle horizontal resizing
        if (resizeDirection === 'right' || 
            resizeDirection === 'top-right' || 
            resizeDirection === 'bottom-right') {
          // Resize from right edge
          newWidth = resizeStart.width + deltaX;
          newWidth = Math.max(minWidth, Math.min(newWidth, window.innerWidth - resizeStart.startX));
        } else if (resizeDirection === 'left' || 
                   resizeDirection === 'top-left' || 
                   resizeDirection === 'bottom-left') {
          // Resize from left edge - adjust both position and width
          newWidth = resizeStart.width - deltaX;
          newWidth = Math.max(minWidth, Math.min(newWidth, resizeStart.startX + resizeStart.width));
          newX = resizeStart.startX + (resizeStart.width - newWidth);
          // Keep window within bounds
          if (newX < 0) {
            newX = 0;
            newWidth = resizeStart.startX + resizeStart.width;
          }
        }

        // Handle vertical resizing
        if (resizeDirection === 'bottom' || 
            resizeDirection === 'bottom-left' || 
            resizeDirection === 'bottom-right') {
          // Resize from bottom edge
          newHeight = resizeStart.height + deltaY;
          newHeight = Math.max(minHeight, Math.min(newHeight, window.innerHeight - resizeStart.startY));
        } else if (resizeDirection === 'top' || 
                   resizeDirection === 'top-left' || 
                   resizeDirection === 'top-right') {
          // Resize from top edge - adjust both position and height
          newHeight = resizeStart.height - deltaY;
          newHeight = Math.max(minHeight, Math.min(newHeight, resizeStart.startY + resizeStart.height));
          newY = resizeStart.startY + (resizeStart.height - newHeight);
          // Keep window within bounds
          if (newY < 0) {
            newY = 0;
            newHeight = resizeStart.startY + resizeStart.height;
          }
        }

        // Ensure window stays within viewport bounds
        if (newX + newWidth > window.innerWidth) {
          newWidth = window.innerWidth - newX;
        }
        if (newY + newHeight > window.innerHeight) {
          newHeight = window.innerHeight - newY;
        }
        
        if (newX < 0) {
          newWidth += newX;
          newX = 0;
          newWidth = Math.max(minWidth, newWidth);
        }
        if (newY < 0) {
          newHeight += newY;
          newY = 0;
          newHeight = Math.max(minHeight, newHeight);
        }

        setWindowState(prev => ({
          ...prev,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        }));
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isResizing, resizeDirection, resizeStart, windowState.isMaximized, isMobile]);

  const handleMaximize = () => {
    if (windowState.isMaximized) {
      // Restore to previous size
      setWindowState(prev => ({
        ...prev,
        isMaximized: false,
        width: INITIAL_WIDTH,
        height: INITIAL_HEIGHT,
        x: window.innerWidth / 2 - INITIAL_WIDTH / 2,
        y: window.innerHeight / 2 - INITIAL_HEIGHT / 2,
      }));
    } else {
      // Save current position and maximize
      setWindowState(prev => ({
        ...prev,
        isMaximized: true,
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
    }
  };

  // const handleMinimize = () => {
  //   setWindowState(prev => ({
  //     ...prev,
  //     isMinimized: !prev.isMinimized,
  //   }));
  // };

  const handleClose = () => {
    setWindowState({
      x: (typeof window !== 'undefined' ? window.innerWidth : 1920) / 2 - INITIAL_WIDTH / 2,
      y: (typeof window !== 'undefined' ? window.innerHeight : 1080) / 2 - INITIAL_HEIGHT / 2,
      width: INITIAL_WIDTH,
      height: INITIAL_HEIGHT,
      isMaximized: false,
      isMinimized: false,
    });
    onClose();
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Available routes
  const routes = ['/', '/about', '/achievements'];

  // Get current path for pwd command
  const getCurrentPath = () => {
    return pathname || '/';
  };

  // Count the number of display lines in command history
  const countHistoryLines = (history: CommandOutput[]): number => {
    return history.reduce((count, item) => {
      if (item.type === 'output' && Array.isArray(item.content)) {
        return count + item.content.length;
      }
      return count + 1; // Each command, error, or single-line output counts as 1 line
    }, 0);
  };

  // Limit command history to maximum number of lines
  const limitHistory = (history: CommandOutput[]): CommandOutput[] => {
    const totalLines = countHistoryLines(history);
    
    if (totalLines <= MAX_HISTORY_LINES) {
      return history;
    }

    // Remove oldest entries until we're under the limit
    const limitedHistory: CommandOutput[] = [];
    let currentLineCount = 0;

    // Start from the end (newest) and work backwards
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];
      let itemLineCount = 1;
      
      if (item.type === 'output' && Array.isArray(item.content)) {
        itemLineCount = item.content.length;
      }

      if (currentLineCount + itemLineCount <= MAX_HISTORY_LINES) {
        limitedHistory.unshift(item);
        currentLineCount += itemLineCount;
      } else {
        // If adding this item would exceed the limit, stop
        break;
      }
    }

    return limitedHistory;
  };

  // Get matching routes for tab completion
  const getMatchingRoutes = (partial: string): string[] => {
    if (!partial) return routes;
    
    // Normalize the partial path
    let normalizedPartial = partial.trim();
    if (!normalizedPartial.startsWith('/')) {
      normalizedPartial = `/${normalizedPartial}`;
    }
    
    // Filter routes that start with the normalized partial
    const matches = routes.filter(route => route.startsWith(normalizedPartial));
    
    // If no matches with leading slash, try matching without leading slash
    if (matches.length === 0 && partial.startsWith('/')) {
      return routes.filter(route => route.startsWith(partial));
    }
    
    return matches;
  };

  // Find common prefix of matching routes
  const getCommonPrefix = (matches: string[]): string => {
    if (matches.length === 0) return '';
    if (matches.length === 1) return matches[0];
    
    let prefix = matches[0];
    for (let i = 1; i < matches.length; i++) {
      while (!matches[i].startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return '';
      }
    }
    return prefix;
  };

  // Handle tab completion for cd command
  const handleTabCompletion = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed.toLowerCase().startsWith('cd ')) {
      return input;
    }

    const pathPart = trimmed.substring(3).trim();
    const matches = getMatchingRoutes(pathPart);
    
    if (matches.length === 0) {
      // No matches - keep input as is, clear suggestions
      setTabSuggestions([]);
      setTabSuggestionIndex(-1);
      return input;
    } else if (matches.length === 1) {
      // Single match - auto-complete
      const completed = `cd ${matches[0]}`;
      setTabSuggestions([]);
      setTabSuggestionIndex(-1);
      return completed;
    } else {
      // Multiple matches - show suggestions and cycle through them
      const now = Date.now();
      const timeSinceLastTab = now - lastTabPress;
      
      // Check if we're cycling through the same set of matches
      const isSameMatchSet = tabSuggestions.length === matches.length && 
        tabSuggestions.every((s, i) => s === matches[i]);
      
      if (timeSinceLastTab < 500 && isSameMatchSet && tabSuggestionIndex >= 0) {
        // Same matches, cycle through them
        const nextIndex = (tabSuggestionIndex + 1) % matches.length;
        setTabSuggestionIndex(nextIndex);
        return `cd ${matches[nextIndex]}`;
      } else {
        // New matches or first tab press - find common prefix first
        const commonPrefix = getCommonPrefix(matches);
        if (commonPrefix && commonPrefix.length > pathPart.length) {
          // Complete to common prefix
          setTabSuggestions(matches);
          setTabSuggestionIndex(-1);
          setLastTabPress(now);
          return `cd ${commonPrefix}`;
        } else {
          // No common prefix, show first match
          setTabSuggestions(matches);
          setTabSuggestionIndex(0);
          setLastTabPress(now);
          return `cd ${matches[0]}`;
        }
      }
    }
  };

  // Execute commands
  const executeCommand = (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
      return;
    }

    const [cmd, ...args] = trimmedCommand.split(' ');
    const output: CommandOutput[] = [{ type: 'command', content: trimmedCommand }];

    switch (cmd.toLowerCase()) {
      case 'help':
        output.push({
          type: 'output',
          content: [
            'Available commands:',
            '  help       - List all supported commands',
            '  ls         - List available site routes',
            '  pwd        - Display the current route',
            '  cd <path>  - Navigate to the given route (e.g., cd /about)',
            '  cd ..      - Return to the previous route',
            '  uname      - Display browser information',
            '  echo <text> - Print the provided text',
            '  clear      - Clear the terminal output',
          ]
        });
        break;

      case 'ls':
        output.push({
          type: 'output',
          content: routes.map(route => `  ${route}`)
        });
        break;

      case 'pwd':
        output.push({
          type: 'output',
          content: getCurrentPath()
        });
        break;

      case 'cd':
        if (args.length === 0) {
          output.push({
            type: 'error',
            content: 'cd: missing argument'
          });
        } else if (args[0] === '..') {
          // Navigate to parent route
          const currentPath = getCurrentPath();
          if (currentPath === '/') {
            output.push({
              type: 'error',
              content: 'cd: already at root directory'
            });
          } else {
            const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
            if (routes.includes(parentPath)) {
              router.push(parentPath);
              output.push({
                type: 'output',
                content: `Navigated to ${parentPath}`
              });
            } else {
              output.push({
                type: 'error',
                content: `cd: ${parentPath}: No such route`
              });
            }
          }
        } else {
          const targetPath = args[0].startsWith('/') ? args[0] : `/${args[0]}`;
          if (routes.includes(targetPath)) {
            router.push(targetPath);
            output.push({
              type: 'output',
              content: `Navigated to ${targetPath}`
            });
          } else {
            output.push({
              type: 'error',
              content: `cd: ${targetPath}: No such route`
            });
          }
        }
        break;

      case 'uname':
        if (typeof window !== 'undefined' && window.navigator) {
          const userAgent = window.navigator.userAgent;
          const platform = window.navigator.platform;
          const language = window.navigator.language;
          output.push({
            type: 'output',
            content: [
              `Platform: ${platform}`,
              `User Agent: ${userAgent}`,
              `Language: ${language}`,
            ]
          });
        } else {
          output.push({
            type: 'error',
            content: 'uname: browser information not available'
          });
        }
        break;

      case 'echo':
        if (args.length > 0) {
          output.push({
            type: 'output',
            content: args.join(' ')
          });
        } else {
          output.push({
            type: 'output',
            content: ''
          });
        }
        break;

      case 'clear':
        setCommandHistory([]);
        return; // Don't add command to history for clear

      default:
        output.push({
          type: 'error',
          content: `${cmd}: command not found. Type "help" for available commands.`
        });
    }

    setCommandHistory(prev => {
      const newHistory = [...prev, ...output];
      return limitHistory(newHistory);
    });
    setCommandHistoryList(prev => [...prev, trimmedCommand]);
    setHistoryIndex(-1);
  };

  // Handle input submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = currentInput.trim();
    
    // Always clear input and tab suggestions
    setCurrentInput('');
    setTabSuggestions([]);
    setTabSuggestionIndex(-1);
    
    if (trimmedInput) {
      // Execute command if there's input
      executeCommand(trimmedInput);
    } else {
      // Empty input - just add a new prompt line without executing anything
      setCommandHistory(prev => {
        const newHistory: CommandOutput[] = [
          ...prev,
          {
            type: 'command' as const,
            content: ''
          }
        ];
        return limitHistory(newHistory);
      });
    }
  };

  // Handle input change - clear tab suggestions when user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
    // Clear tab suggestions when user modifies input
    if (tabSuggestions.length > 0) {
      setTabSuggestions([]);
      setTabSuggestionIndex(-1);
    }
  };

  // Handle click on terminal content area to focus input
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Don't focus if clicking on interactive elements
    const isInteractiveElement = 
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.closest('button') !== null ||
      target.closest('a') !== null;
    
    // Don't focus if user has text selected (they might be copying)
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    const hasSelection = selection ? selection.toString().length > 0 : false;
    
    // Focus input if clicking on non-interactive content
    if (!isInteractiveElement && !hasSelection && inputRef.current) {
      // Use setTimeout to ensure this runs after any other click handlers
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const completed = handleTabCompletion(currentInput);
      setCurrentInput(completed);
      // Reset tab suggestions after a delay if user types something else
      setTimeout(() => {
        if (tabSuggestions.length > 0) {
          const now = Date.now();
          if (now - lastTabPress > 1000) {
            setTabSuggestions([]);
            setTabSuggestionIndex(-1);
          }
        }
      }, 1000);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Clear tab suggestions when navigating history
      setTabSuggestions([]);
      setTabSuggestionIndex(-1);
      if (commandHistoryList.length > 0) {
        const newIndex = historyIndex === -1 
          ? commandHistoryList.length - 1 
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistoryList[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Clear tab suggestions when navigating history
      setTabSuggestions([]);
      setTabSuggestionIndex(-1);
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistoryList.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistoryList[newIndex]);
        }
      }
    }
    // Note: Tab suggestions are cleared in handleInputChange when user types
  };

  if (!isOpen) return null;

  const getCursorStyle = () => {
    if (isDragging) return 'grabbing';
    if (isResizing) {
      switch (resizeDirection) {
        case 'top':
        case 'bottom':
          return 'ns-resize';
        case 'left':
        case 'right':
          return 'ew-resize';
        case 'top-left':
        case 'bottom-right':
          return 'nwse-resize';
        case 'top-right':
        case 'bottom-left':
          return 'nesw-resize';
        default:
          return 'default';
      }
    }
    return 'default';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Terminal Window */}
          <motion.div
            ref={terminalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              display: windowState.isMinimized ? 'none' : 'block'
            }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed z-9999"
            style={{
              left: windowState.isMaximized ? 0 : `${windowState.x}px`,
              top: windowState.isMaximized ? 0 : `${windowState.y}px`,
              width: windowState.isMaximized ? '100%' : `${windowState.width}px`,
              height: windowState.isMaximized ? '100%' : `${windowState.height}px`,
              cursor: getCursorStyle(),
              willChange: isDragging || isResizing ? 'transform' : 'auto',
            }}
          >
            <div className={`w-full h-full ${isMobile ? 'rounded-lg' : 'rounded-t-lg'} flex flex-col overflow-hidden relative transition-colors ${
              theme === 'dark' 
                ? 'bg-[#2d2d2d] border border-[#1a1a1a] shadow-[0_20px_60px_rgba(0,0,0,0.5)]' 
                : 'bg-[#f5f5f5] border border-[#d0d0d0] shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
            }`}>
              {/* macOS Title Bar */}
              <div
                ref={headerRef}
                onMouseDown={handleMouseDown}
                onTouchStart={(e) => {
                  // Enable touch dragging on mobile
                  if (isMobile && !windowState.isMaximized && !windowState.isMinimized) {
                    const touch = e.touches[0];
                    setIsDragging(true);
                    setDragStart({
                      x: touch.clientX - windowState.x,
                      y: touch.clientY - windowState.y,
                    });
                  }
                }}
                className={`flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 border-b select-none ${isMobile ? 'rounded-t-lg' : 'rounded-t-lg'} transition-colors ${
                  isMobile ? '' : 'cursor-grab active:cursor-grabbing'
                } ${
                  theme === 'dark'
                    ? 'bg-[#3a3a3a] border-[#1a1a1a]'
                    : 'bg-[#e8e8e8] border-[#d0d0d0]'
                }`}
              >
                {/* macOS Traffic Light Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="w-4 h-4 rounded-full bg-[#ff5f57] hover:bg-[#ff4747] transition-colors flex items-center justify-center group"
                    aria-label="Close"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#740000] opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-4 h-4 rounded-full bg-[#ffbd2e] hover:bg-[#ffb400] transition-colors flex items-center justify-center group"
                    aria-label="Minimize"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#995700] opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </button>
                  <button
                    onClick={handleMaximize}
                    className="w-4 h-4 rounded-full bg-[#28c840] hover:bg-[#24b339] transition-colors flex items-center justify-center group"
                    aria-label={windowState.isMaximized ? 'Restore' : 'Maximize'}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#006500] opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  </button>
                </div>

                {/* Window Title */}
                <div className={`absolute left-1/2 transform -translate-x-1/2 text-xs font-medium transition-colors ${
                  theme === 'dark' ? 'text-[#d0d0d0]' : 'text-[#333333]'
                }`}>
                  Terminal
                </div>

                {/* Spacer for right side balance */}
                <div className="w-[68px]"></div>
              </div>

              {/* macOS Terminal Content */}
              <div 
                ref={contentRef}
                onClick={handleContentClick}
                className={`flex-1 font-mono text-xs md:text-sm overflow-auto p-3 md:p-4 transition-colors cursor-text ${
                  theme === 'dark'
                    ? 'bg-[#1e1e1e] text-[#d0d0d0]'
                    : 'bg-[#ffffff] text-[#000000]'
                }`}
              >
                <div className="space-y-1">
                  {/* Command History */}
                  {commandHistory.map((item, index) => (
                    <div key={index} className="mb-1">
                      {item.type === 'command' && (
                        <div className="flex items-center gap-2">
                          <span className={theme === 'dark' ? 'text-[#5fd7ff]' : 'text-[#0066cc]'}>user@portfolio</span>
                          <span className={theme === 'dark' ? 'text-[#666666]' : 'text-[#666666]'}>:</span>
                          <span className={theme === 'dark' ? 'text-[#87ceeb]' : 'text-[#0066cc]'}>{getCurrentPath()}</span>
                          <span className={theme === 'dark' ? 'text-[#666666]' : 'text-[#666666]'}>$</span>
                          <span className={theme === 'dark' ? 'text-[#d0d0d0]' : 'text-[#000000]'}>{item.content}</span>
                        </div>
                      )}
                      {item.type === 'output' && (
                        <div className={theme === 'dark' ? 'text-[#d0d0d0]' : 'text-[#000000]'}>
                          {Array.isArray(item.content) ? (
                            item.content.map((line, lineIndex) => (
                              <div key={lineIndex}>{line}</div>
                            ))
                          ) : (
                            <div>{item.content}</div>
                          )}
                        </div>
                      )}
                      {item.type === 'error' && (
                        <div className={theme === 'dark' ? 'text-[#ff6b6b]' : 'text-[#cc0000]'}>
                          {item.content}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Input Line */}
                  <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <span className={theme === 'dark' ? 'text-[#5fd7ff]' : 'text-[#0066cc]'}>user@portfolio</span>
                    <span className={theme === 'dark' ? 'text-[#666666]' : 'text-[#666666]'}>:</span>
                    <span className={theme === 'dark' ? 'text-[#87ceeb]' : 'text-[#0066cc]'}>{getCurrentPath()}</span>
                    <span className={theme === 'dark' ? 'text-[#666666]' : 'text-[#666666]'}>$</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={currentInput}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className={`flex-1 bg-transparent border-none outline-none ${
                        theme === 'dark' ? 'text-[#d0d0d0]' : 'text-[#000000]'
                      }`}
                      autoFocus
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </form>

                  {/* Tab Completion Suggestions */}
                  {tabSuggestions.length > 1 && (
                    <div className={`mt-2 pt-2 border-t ${
                      theme === 'dark' ? 'border-[#4a4a4a]' : 'border-[#d0d0d0]'
                    }`}>
                      <div className={`text-xs mb-1 ${
                        theme === 'dark' ? 'text-[#666666]' : 'text-[#666666]'
                      }`}>
                        Multiple matches ({tabSuggestions.length}):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {tabSuggestions.map((suggestion, index) => (
                          <span
                            key={suggestion}
                            className={`px-2 py-1 rounded text-xs ${
                              index === tabSuggestionIndex
                                ? theme === 'dark'
                                  ? 'bg-[#4a4a4a] text-[#5fd7ff]'
                                  : 'bg-[#e8e8e8] text-[#0066cc]'
                                : theme === 'dark'
                                  ? 'bg-[#2d2d2d] text-[#d0d0d0]'
                                  : 'bg-[#f5f5f5] text-[#000000]'
                            }`}
                          >
                            {suggestion}
                          </span>
                        ))}
                      </div>
                      <div className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-[#666666]' : 'text-[#666666]'
                      }`}>
                        Press Tab to cycle through matches
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resize Handles - Only show when not maximized and not on mobile */}
              {!windowState.isMaximized && !isMobile && (
                <>
                  {/* Top edge */}
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
                    className={`absolute top-0 left-0 w-full cursor-ns-resize transition-colors ${
                      theme === 'dark' ? 'hover:bg-[#4a4a4a]/30' : 'hover:bg-[#d0d0d0]/30'
                    }`}
                    style={{ 
                      height: EDGE_HANDLE_SIZE,
                      zIndex: 10 
                    }}
                  />

                  {/* Right edge */}
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                    className={`absolute top-0 right-0 cursor-ew-resize transition-colors ${
                      theme === 'dark' ? 'hover:bg-[#4a4a4a]/30' : 'hover:bg-[#d0d0d0]/30'
                    }`}
                    style={{ 
                      width: EDGE_HANDLE_SIZE,
                      height: '100%',
                      zIndex: 10 
                    }}
                  />

                  {/* Bottom edge */}
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
                    className={`absolute bottom-0 left-0 w-full cursor-ns-resize transition-colors ${
                      theme === 'dark' ? 'hover:bg-[#4a4a4a]/30' : 'hover:bg-[#d0d0d0]/30'
                    }`}
                    style={{ 
                      height: EDGE_HANDLE_SIZE,
                      zIndex: 10 
                    }}
                  />

                  {/* Left edge */}
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
                    className={`absolute top-0 left-0 cursor-ew-resize transition-colors ${
                      theme === 'dark' ? 'hover:bg-[#4a4a4a]/30' : 'hover:bg-[#d0d0d0]/30'
                    }`}
                    style={{ 
                      width: EDGE_HANDLE_SIZE,
                      height: '100%',
                      zIndex: 10 
                    }}
                  />

                  {/* Top-left corner */}
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
                    className="absolute top-0 left-0 cursor-nwse-resize"
                    style={{
                      width: RESIZE_HANDLE_SIZE,
                      height: RESIZE_HANDLE_SIZE,
                      zIndex: 11,
                    }}
                  >
                    <div
                      className={`absolute top-0 left-0 w-full h-full transition-colors rounded-tl-lg ${
                        theme === 'dark' 
                          ? 'bg-[#4a4a4a]/20 hover:bg-[#4a4a4a]/40' 
                          : 'bg-[#d0d0d0]/20 hover:bg-[#d0d0d0]/40'
                      }`}
                    />
                  </div>

                  {/* Top-right corner */}
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
                    className="absolute top-0 right-0 cursor-nesw-resize"
                    style={{
                      width: RESIZE_HANDLE_SIZE,
                      height: RESIZE_HANDLE_SIZE,
                      zIndex: 11,
                    }}
                  >
                    <div
                      className={`absolute top-0 right-0 w-full h-full transition-colors rounded-tr-lg ${
                        theme === 'dark' 
                          ? 'bg-[#4a4a4a]/20 hover:bg-[#4a4a4a]/40' 
                          : 'bg-[#d0d0d0]/20 hover:bg-[#d0d0d0]/40'
                      }`}
                    />
                  </div>

                  {/* Bottom-left corner */}
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
                    className="absolute bottom-0 left-0 cursor-nesw-resize"
                    style={{
                      width: RESIZE_HANDLE_SIZE,
                      height: RESIZE_HANDLE_SIZE,
                      zIndex: 11,
                    }}
                  >
                    <div
                      className={`absolute bottom-0 left-0 w-full h-full transition-colors rounded-bl-lg ${
                        theme === 'dark' 
                          ? 'bg-[#4a4a4a]/20 hover:bg-[#4a4a4a]/40' 
                          : 'bg-[#d0d0d0]/20 hover:bg-[#d0d0d0]/40'
                      }`}
                    />
                  </div>

                  {/* Bottom-right corner */}
                  <div
                    data-resize-handle
                    onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
                    className="absolute bottom-0 right-0 cursor-nwse-resize"
                    style={{
                      width: RESIZE_HANDLE_SIZE,
                      height: RESIZE_HANDLE_SIZE,
                      zIndex: 11,
                    }}
                  >
                    <div
                      className={`absolute bottom-0 right-0 w-full h-full transition-colors rounded-br-lg ${
                        theme === 'dark' 
                          ? 'bg-[#4a4a4a]/20 hover:bg-[#4a4a4a]/40' 
                          : 'bg-[#d0d0d0]/20 hover:bg-[#d0d0d0]/40'
                      }`}
                    />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
