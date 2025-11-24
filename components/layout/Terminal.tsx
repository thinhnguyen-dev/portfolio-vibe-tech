'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { RiArrowRightWideLine } from 'react-icons/ri';
import { FaApple } from 'react-icons/fa';

type Theme = 'light' | 'dark';

interface CommandOutput {
  type: 'command' | 'output' | 'error';
  content: string | string[];
  isRoot?: boolean; // Track if command was executed as root
  isAccepted?: boolean; // Track if command was accepted via Tab autocomplete
  pathname?: string; // Track the path when command was executed
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
const MIN_VISIBLE_AREA = 100; // Minimum visible pixels required to grab and reposition window

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
  const [currentTime, setCurrentTime] = useState<string>('');
  const [inlineAutocomplete, setInlineAutocomplete] = useState<{ matched: string; unmatched: string } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isRoot, setIsRoot] = useState(false);
  const [isPasswordPrompt, setIsPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [commandAccepted, setCommandAccepted] = useState(false); // Track if current command was accepted via Tab

  const terminalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousWindowStateRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

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

  // Handle window resize to keep terminal within bounds (with minimum visible area)
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
        // Calculate constraints with minimum visible area
        const minVisibleX = -(windowState.width - MIN_VISIBLE_AREA);
        const maxVisibleX = window.innerWidth - MIN_VISIBLE_AREA;
        const minVisibleY = -(windowState.height - MIN_VISIBLE_AREA);
        const maxVisibleY = window.innerHeight - MIN_VISIBLE_AREA;

        setWindowState(prev => {
          let newX = prev.x;
          let newY = prev.y;
          let newWidth = prev.width;
          let newHeight = prev.height;

          // Constrain position to ensure minimum visible area
          newX = Math.max(minVisibleX, Math.min(newX, maxVisibleX));
          newY = Math.max(minVisibleY, Math.min(newY, maxVisibleY));

          // Constrain width/height to viewport (but allow window to extend beyond)
          newWidth = Math.min(prev.width, window.innerWidth + MIN_VISIBLE_AREA);
          newHeight = Math.min(prev.height, window.innerHeight + MIN_VISIBLE_AREA);

          return {
            ...prev,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          };
        });
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isOpen, windowState.isMaximized, windowState.width, windowState.height]);

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

        // Allow dragging outside viewport, but enforce minimum visible area
        // This ensures user can always grab and reposition the window
        const minVisibleX = -(windowState.width - MIN_VISIBLE_AREA);
        const maxVisibleX = window.innerWidth - MIN_VISIBLE_AREA;
        const minVisibleY = -(windowState.height - MIN_VISIBLE_AREA);
        const maxVisibleY = window.innerHeight - MIN_VISIBLE_AREA;

        // Constrain to ensure minimum visible area is always present
        newX = Math.max(minVisibleX, Math.min(newX, maxVisibleX));
        newY = Math.max(minVisibleY, Math.min(newY, maxVisibleY));

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
      const previousState = previousWindowStateRef.current;
      if (previousState) {
        setWindowState(prev => ({
          ...prev,
          isMaximized: false,
          x: previousState.x,
          y: previousState.y,
          width: previousState.width,
          height: previousState.height,
        }));
        previousWindowStateRef.current = null;
      } else {
        // Fallback to initial size if no previous state
        setWindowState(prev => ({
          ...prev,
          isMaximized: false,
          width: INITIAL_WIDTH,
          height: INITIAL_HEIGHT,
          x: window.innerWidth / 2 - INITIAL_WIDTH / 2,
          y: window.innerHeight / 2 - INITIAL_HEIGHT / 2,
        }));
      }
    } else {
      // Save current position and size before maximizing
      previousWindowStateRef.current = {
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
      };
      // Maximize
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

  // Handle double-click on header to toggle maximize
  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    e.preventDefault();
    handleMaximize();
  };

  // Save current terminal state to sessionStorage
  const saveTerminalState = () => {
    try {
      sessionStorage.setItem('terminalState', JSON.stringify({
        commandHistory: commandHistory,
        commandHistoryList: commandHistoryList,
        isRoot: isRoot,
        windowState: windowState,
        shouldRestore: true, // Flag to indicate this is a hide/restore operation
      }));
    } catch {
      // Ignore storage errors
    }
  };

  const handleMinimize = () => {
    // Save current state before closing
    saveTerminalState();
    onClose();
  };

  // Reset all terminal state to initial values
  const resetTerminalState = () => {
    // Reset command history to welcome message
    setCommandHistory([
      { type: 'output', content: 'Welcome to the terminal. Type "help" to see available commands.' }
    ]);
    setCurrentInput('');
    setHistoryIndex(-1);
    setCommandHistoryList([]);
    setTabSuggestions([]);
    setTabSuggestionIndex(-1);
    setLastTabPress(0);
    setInlineAutocomplete(null);
    setIsExecuting(false);
    setIsRoot(false);
    setIsPasswordPrompt(false);
    setPasswordInput('');
    
    // Reset window state
    const initialSize = getInitialSize();
    setWindowState({
      x: initialSize.x,
      y: initialSize.y,
      width: initialSize.width,
      height: initialSize.height,
      isMaximized: false,
      isMinimized: false,
    });
    
    // Clear any saved state from sessionStorage
    try {
      sessionStorage.removeItem('terminalState');
    } catch {
      // Ignore storage errors
    }
  };

  const handleClose = () => {
    // Reset all internal state and clear history
    resetTerminalState();
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

  // Restore terminal state after reboot, navigation, or hide/minimize
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    
    try {
      const savedState = sessionStorage.getItem('terminalState');
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // Restore state if shouldRestore flag is set (from hide/minimize) or shouldReopen (from reboot/blog)
        if (state.shouldRestore || state.shouldReopen) {
          // Restore command history
          if (state.commandHistory && Array.isArray(state.commandHistory) && state.commandHistory.length > 0) {
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => {
              setCommandHistory(prev => {
                // Merge saved history with welcome message if it exists
                const welcomeMsg = prev.find(item => item.type === 'output' && typeof item.content === 'string' && item.content.includes('Welcome'));
                if (welcomeMsg) {
                  return [welcomeMsg, ...state.commandHistory as CommandOutput[]];
                }
                return state.commandHistory as CommandOutput[];
              });
            }, 0);
          }
          
          // Restore command history list for arrow key navigation
          if (state.commandHistoryList && Array.isArray(state.commandHistoryList) && state.commandHistoryList.length > 0) {
            setTimeout(() => {
              setCommandHistoryList(state.commandHistoryList);
            }, 0);
          }
          
          // Restore root state if it was set
          if (state.isRoot === true) {
            setTimeout(() => {
              setIsRoot(true);
            }, 0);
          }
          
          // Restore window state if it was saved
          if (state.windowState && typeof state.windowState === 'object') {
            setTimeout(() => {
              setWindowState(prev => ({
                ...prev,
                ...state.windowState,
                isMinimized: false, // Always show when restoring
              }));
            }, 0);
          }
          
          // Clear shouldRestore flag after restoring (but keep shouldReopen for TerminalWrapper)
          const { shouldRestore, shouldReopen, ...restState } = state;
          if (shouldReopen) {
            // Keep the flag for TerminalWrapper to handle
            sessionStorage.setItem('terminalState', JSON.stringify({ ...restState, shouldReopen }));
          } else if (shouldRestore) {
            // Clear state completely after restoring from hide/minimize
            // This ensures that if user closes terminal, it starts fresh next time
            sessionStorage.removeItem('terminalState');
          }
        } else {
          // No restore flags - clear saved state
          sessionStorage.removeItem('terminalState');
        }
      }
    } catch {
      // Ignore errors
    }
  }, [isOpen]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Auto-focus input after command execution completes
  useEffect(() => {
    // When isExecuting becomes false, it means a command just finished
    if (!isExecuting && isOpen && inputRef.current) {
      // Use a small delay to ensure DOM updates are complete
      const timeoutId = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isExecuting, isOpen]);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Live clock - update every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    // Set initial time
    updateTime();

    // Update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Available routes
  const routes = ['/', '/about', '/achievements'];

  // Available commands for autocomplete
  const availableCommands = [
    'help', 'ls', 'pwd', 'cd', 'uname', 'echo', 'clear',
    'whoami', 'reboot', 'github', 'blog', 'theme',
    'sudo', 'su', 'logout', 'exit'
  ];

  // Get current path for pwd command
  const getCurrentPath = () => {
    return pathname || '/';
  };

  // Format pathname for display (use ~ for root, ~/path for subdirectories)
  const getDisplayPath = (targetPath?: string) => {
    const currentPath = targetPath || pathname || '/';
    if (currentPath === '/') {
      return '';
    }
    // Remove leading slash and format as ~/path
    const pathWithoutSlash = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
    return `/${pathWithoutSlash}`;
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

  // Handle tab completion for commands and cd paths
  const handleTabCompletion = (input: string): string => {
    const trimmed = input.trim();
    
    // Check if it's a cd command
    if (trimmed.toLowerCase().startsWith('cd ')) {
      const pathPart = trimmed.substring(3).trim();
      const matches = getMatchingRoutes(pathPart);
      
      if (matches.length === 0) {
        // No matches - keep input as is, clear suggestions
        setTabSuggestions([]);
        setTabSuggestionIndex(-1);
        setCommandAccepted(false);
        return input;
      } else if (matches.length === 1) {
        // Single match - auto-complete
        const completed = `cd ${matches[0]}`;
        setTabSuggestions([]);
        setTabSuggestionIndex(-1);
        setCommandAccepted(true);
        setInlineAutocomplete(null); // Clear autocomplete when fully accepted
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
          setCommandAccepted(true);
          setInlineAutocomplete(null); // Clear autocomplete when cycling to a match
          return `cd ${matches[nextIndex]}`;
        } else {
          // New matches or first tab press - find common prefix first
          const commonPrefix = getCommonPrefix(matches);
          if (commonPrefix && commonPrefix.length > pathPart.length) {
            // Complete to common prefix
            setTabSuggestions(matches);
            setTabSuggestionIndex(-1);
            setLastTabPress(now);
            setCommandAccepted(false);
            return `cd ${commonPrefix}`;
          } else {
            // No common prefix, show first match
            setTabSuggestions(matches);
            setTabSuggestionIndex(0);
            setLastTabPress(now);
            setCommandAccepted(false);
            return `cd ${matches[0]}`;
          }
        }
      }
    }

    // Check for command autocomplete (only if no space, meaning it's just a command name)
    if (!trimmed.includes(' ')) {
      const matches = getMatchingCommands(trimmed);
      
      if (matches.length === 0) {
        // No matches - keep input as is, clear suggestions
        setTabSuggestions([]);
        setTabSuggestionIndex(-1);
        setCommandAccepted(false);
        return input;
      } else if (matches.length === 1) {
        // Single match - auto-complete
        setTabSuggestions([]);
        setTabSuggestionIndex(-1);
        setCommandAccepted(true);
        return matches[0];
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
          setCommandAccepted(true);
          setInlineAutocomplete(null); // Clear autocomplete when cycling to a match
          return matches[nextIndex];
        } else {
          // New matches or first tab press - find common prefix first
          const commonPrefix = getCommonPrefix(matches);
          if (commonPrefix && commonPrefix.length > trimmed.length) {
            // Complete to common prefix
            setTabSuggestions(matches);
            setTabSuggestionIndex(-1);
            setLastTabPress(now);
            setCommandAccepted(false);
            return commonPrefix;
          } else {
            // No common prefix, show first match
            setTabSuggestions(matches);
            setTabSuggestionIndex(0);
            setLastTabPress(now);
            setCommandAccepted(true);
            return matches[0];
          }
        }
      }
    }

    // No autocomplete for other cases
    setCommandAccepted(false);
    return input;
  };

  // Execute commands
  const executeCommand = async (command: string): Promise<void> => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
      return;
    }

    const [cmd, ...args] = trimmedCommand.split(' ');
    const output: CommandOutput[] = [{ 
      type: 'command', 
      content: trimmedCommand, 
      isRoot,
      isAccepted: commandAccepted, // Track if command was accepted via Tab
      pathname: pathname || '/' // Store the path when command was executed
    }];
    // Reset command accepted flag after adding to history
    setCommandAccepted(false);

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
            '  uname      - Display browser information',
            '  echo <text> - Print the provided text',
            '  clear      - Clear the terminal output',
            '  whoami     - Display your IP address',
            '  reboot     - Reload the current page',
            '  github     - Open GitHub page',
            '  blog       - Open blog page',
            '  theme      - Toggle between light and dark theme',
            '  sudo su    - Switch to root user (requires password)',
            '  logout     - Switch back to normal user (if root)',
            '  exit       - Close the terminal',
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

      case 'whoami':
        // Add "Checking..." message immediately
        output.push({ type: 'output' as const, content: 'Checking...' });
        setCommandHistory(prev => {
          const newHistory: CommandOutput[] = [...prev, ...output];
          return limitHistory(newHistory);
        });
        setCommandHistoryList(prev => [...prev, trimmedCommand]);
        setHistoryIndex(-1);
        
        // Fetch user's IP address with 10s timeout using async/await
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          
          const data = await response.json();
          // Replace "Checking..." with the actual result
          setCommandHistory(prev => {
            const newHistory = [...prev];
            // Find and replace the last "Checking..." message
            const lastIndex = newHistory.length - 1;
            if (lastIndex >= 0 && newHistory[lastIndex].type === 'output' && newHistory[lastIndex].content === 'Checking...') {
              newHistory[lastIndex] = { type: 'output' as const, content: `You are ${data.ip}` };
            } else {
              // Fallback: add the result if we couldn't find "Checking..."
              newHistory.push({ type: 'output' as const, content: `You are ${data.ip}` });
            }
            return limitHistory(newHistory);
          });
        } catch (error: unknown) {
          clearTimeout(timeoutId);
          const errorMessage = (error as Error).name === 'AbortError' 
            ? 'whoami: Request timeout (10s exceeded)'
            : 'whoami: Unable to fetch IP address';
          // Replace "Checking..." with the error message
          setCommandHistory(prev => {
            const newHistory = [...prev];
            // Find and replace the last "Checking..." message
            const lastIndex = newHistory.length - 1;
            if (lastIndex >= 0 && newHistory[lastIndex].type === 'output' && newHistory[lastIndex].content === 'Checking...') {
              newHistory[lastIndex] = { type: 'error' as const, content: errorMessage };
            } else {
              // Fallback: add the error if we couldn't find "Checking..."
              newHistory.push({ type: 'error' as const, content: errorMessage });
            }
            return limitHistory(newHistory);
          });
        }
        return; // Exit early since we've handled everything

      case 'reboot':
        // Save terminal state to sessionStorage before reload
        try {
          sessionStorage.setItem('terminalState', JSON.stringify({
            isOpen: true,
            commandHistory: commandHistory.slice(-10), // Save last 10 entries
            shouldReopen: true, // Flag to automatically reopen terminal
          }));
        } catch {
          // Ignore storage errors
        }
        output.push({
          type: 'output' as const,
          content: 'Rebooting...'
        });
        setCommandHistory(prev => {
          const newHistory: CommandOutput[] = [...prev, ...output];
          return limitHistory(newHistory);
        });
        setCommandHistoryList(prev => [...prev, trimmedCommand]);
        setHistoryIndex(-1);
        // Reload page after a short delay to show the message
        setTimeout(() => {
          window.location.reload();
        }, 500);
        return; // Exit early since we're reloading

      case 'github':
        output.push({
          type: 'output' as const,
          content: 'Opening GitHub...'
        });
        setCommandHistory(prev => {
          const newHistory: CommandOutput[] = [...prev, ...output];
          return limitHistory(newHistory);
        });
        setCommandHistoryList(prev => [...prev, trimmedCommand]);
        setHistoryIndex(-1);
        // Open GitHub in new tab
        window.open('https://github.com', '_blank');
        break;

      case 'blog':
        // Calculate the new state before updating
        output.push({
          type: 'output' as const,
          content: 'Navigating to blog...'
        });
        const newHistory = [...commandHistory];
        const limitedHistory = limitHistory(newHistory);
        const newCommandHistoryList = [...commandHistoryList, trimmedCommand];
        
        // Save terminal state to sessionStorage before navigation
        try {
          sessionStorage.setItem('terminalState', JSON.stringify({
            isOpen: true,
            commandHistory: limitedHistory,
            commandHistoryList: newCommandHistoryList,
            shouldReopen: true, // Flag to automatically reopen terminal
          }));
        } catch {
          // Ignore storage errors
        }
        
        // Update state
        setCommandHistory(limitedHistory);
        setCommandHistoryList(newCommandHistoryList);
        setHistoryIndex(-1);
        
        // Navigate to /blog route within the app
        // Use a small delay to ensure state is saved and UI is updated
        setTimeout(() => {
          router.push('/blog');
        }, 150);
        break;

      case 'theme':
        const currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Apply theme change
        document.documentElement.classList.remove(currentTheme);
        document.documentElement.classList.add(newTheme);
        localStorage.setItem('theme', newTheme);
        
        output.push({
          type: 'output',
          content: `Theme switched to ${newTheme} mode`
        });
        break;

      case 'sudo':
        if (args.length > 0 && args[0].toLowerCase() === 'su') {
          // Handle sudo su
          if (isRoot) {
            output.push({
              type: 'output' as const,
              content: 'Already running as root.'
            });
          } else {
            // Add command to history first
            setCommandHistory(prev => {
              const newHistory: CommandOutput[] = [...prev, ...output];
              return limitHistory(newHistory);
            });
            setCommandHistoryList(prev => [...prev, trimmedCommand]);
            setHistoryIndex(-1);
            
            // Trigger password prompt
            setIsPasswordPrompt(true);
            setPasswordInput('');
            setCommandHistory(prev => {
              const newHistory: CommandOutput[] = [
                ...prev,
                { type: 'output' as const, content: 'Password:' }
              ];
              return limitHistory(newHistory);
            });
            return;
          }
        } else {
          output.push({
            type: 'error' as const,
            content: 'sudo: usage: sudo su'
          });
        }
        break;

      case 'su':
        if (isRoot) {
          output.push({
            type: 'output' as const,
            content: 'Already running as root.'
          });
        } else {
          // Add command to history first
          setCommandHistory(prev => {
            const newHistory: CommandOutput[] = [...prev, ...output];
            return limitHistory(newHistory);
          });
          setCommandHistoryList(prev => [...prev, trimmedCommand]);
          setHistoryIndex(-1);
          
          // Trigger password prompt
          setIsPasswordPrompt(true);
          setPasswordInput('');
          setCommandHistory(prev => {
            const newHistory: CommandOutput[] = [
              ...prev,
              { type: 'output' as const, content: 'Password:' }
            ];
            return limitHistory(newHistory);
          });
          return;
        }
        break;

      case 'logout':
        if (isRoot) {
          // Switch back to normal user
          setIsRoot(false);
          output.push({
            type: 'output' as const,
            content: 'Logged out. Switched back to normal user.'
          });
        } else {
          output.push({
            type: 'output' as const,
            content: 'You are not logged in as root.'
          });
        }
        break;

      case 'exit':
        // Close the terminal
        output.push({
          type: 'output' as const,
          content: 'Closing terminal...'
        });
        setCommandHistory(prev => {
          const newHistory: CommandOutput[] = [...prev, ...output];
          return limitHistory(newHistory);
        });
        setCommandHistoryList(prev => [...prev, trimmedCommand]);
        setHistoryIndex(-1);
        // Close terminal after a short delay to show the message
        setTimeout(() => {
          onClose();
        }, 300);
        return; // Exit early since we're closing

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

  // Handle password submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const PASSWORD = '1234';
    
    if (passwordInput === PASSWORD) {
      // Correct password - switch to root
      setIsRoot(true);
      setIsPasswordPrompt(false);
      setPasswordInput('');
      
      // Add success message to history
      setCommandHistory(prev => {
        const newHistory: CommandOutput[] = [
          ...prev,
          { type: 'output' as const, content: 'Authentication successful. You are now root.' }
        ];
        return limitHistory(newHistory);
      });
      
      // Focus input after password success
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    } else {
      // Incorrect password - show error and close password prompt
      setIsPasswordPrompt(false);
      setPasswordInput('');
      
      // Add error message to history
      setCommandHistory(prev => {
        const newHistory: CommandOutput[] = [
          ...prev,
          { type: 'error' as const, content: 'Sorry, incorrect password!' }
        ];
        return limitHistory(newHistory);
      });
      
      // Show normal input line and focus it so user can try again or enter another command
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  };

  // Handle input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If password prompt is active, handle password submission
    if (isPasswordPrompt) {
      handlePasswordSubmit(e);
      return;
    }
    
    const trimmedInput = currentInput.trim();
    
    // Prevent submission if a command is already executing
    if (isExecuting) {
      return;
    }
    
    // Always clear input and tab suggestions
    setCurrentInput('');
    setTabSuggestions([]);
    setTabSuggestionIndex(-1);
    setInlineAutocomplete(null);
    
    if (trimmedInput) {
      // Set executing state and execute command
      setIsExecuting(true);
      try {
        await executeCommand(trimmedInput);
      } finally {
        // Always clear executing state when done
        setIsExecuting(false);
      }
    } else {
      // Empty input - just add a new prompt line without executing anything
      setCommandHistory(prev => {
        const newHistory: CommandOutput[] = [
          ...prev,
          {
            type: 'command' as const,
            content: '',
            isRoot,
            isAccepted: false
          }
        ];
        return limitHistory(newHistory);
      });
      // Reset command accepted flag
      setCommandAccepted(false);
      // Focus input after empty command is processed
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  };

  // Get matching commands for autocomplete
  const getMatchingCommands = (partial: string): string[] => {
    if (!partial) return availableCommands;
    const lowerPartial = partial.toLowerCase();
    return availableCommands.filter(cmd => cmd.toLowerCase().startsWith(lowerPartial));
  };

  // Get inline autocomplete suggestion for commands and cd paths
  const getInlineAutocomplete = (input: string): { matched: string; unmatched: string } | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check if it's a cd command
    if (trimmed.toLowerCase().startsWith('cd ')) {
      const pathPart = trimmed.substring(3).trim();
      if (!pathPart) {
        return null;
      }

      const matches = getMatchingRoutes(pathPart);
      
      if (matches.length === 1) {
        // Single match - show autocomplete
        const match = matches[0];
        const normalizedPath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
        
        if (match.startsWith(normalizedPath) && match.length > normalizedPath.length) {
          return {
            matched: trimmed, // Full input including "cd "
            unmatched: match.substring(normalizedPath.length)
          };
        }
      } else if (matches.length > 1) {
        // Multiple matches - show common prefix
        const commonPrefix = getCommonPrefix(matches);
        const normalizedPath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
        
        if (commonPrefix.startsWith(normalizedPath) && commonPrefix.length > normalizedPath.length) {
          return {
            matched: trimmed, // Full input including "cd "
            unmatched: commonPrefix.substring(normalizedPath.length)
          };
        }
      }
      return null;
    }

    // Check for command autocomplete (only if no space, meaning it's just a command name)
    if (!trimmed.includes(' ')) {
      const matches = getMatchingCommands(trimmed);
      
      if (matches.length === 1) {
        // Single match - show autocomplete
        const match = matches[0];
        if (match.toLowerCase().startsWith(trimmed.toLowerCase()) && match.length > trimmed.length) {
          return {
            matched: trimmed,
            unmatched: match.substring(trimmed.length)
          };
        }
      } else if (matches.length > 1) {
        // Multiple matches - show common prefix
        const commonPrefix = getCommonPrefix(matches);
        if (commonPrefix.toLowerCase().startsWith(trimmed.toLowerCase()) && commonPrefix.length > trimmed.length) {
          return {
            matched: trimmed,
            unmatched: commonPrefix.substring(trimmed.length)
          };
        }
      }
    }
    
    return null;
  };

  // Convert Vietnamese Unicode characters to ASCII equivalents
  const vietnameseToAscii = (text: string): string => {
    // Map Vietnamese characters to ASCII equivalents
    const vietnameseMap: { [key: string]: string } = {
      // đ and Đ
      'đ': 'd', 'Đ': 'D',
      // ư and ư with tones
      'ư': 'w', 'Ư': 'W',
      'ứ': 'w', 'Ứ': 'W', 'ừ': 'w', 'Ừ': 'W',
      'ử': 'w', 'Ử': 'W', 'ữ': 'w', 'Ữ': 'W',
      'ự': 'w', 'Ự': 'W',
      // ơ and ơ with tones
      'ơ': 'ow', 'Ơ': 'OW',
      'ớ': 'ow', 'Ớ': 'OW', 'ờ': 'ow', 'Ờ': 'OW',
      'ở': 'ow', 'Ở': 'OW', 'ỡ': 'ow', 'Ỡ': 'OW',
      'ợ': 'ow', 'Ợ': 'OW',
      // ă and ă with tones
      'ă': 'aa', 'Ă': 'AA',
      'ắ': 'aa', 'Ắ': 'AA', 'ằ': 'aa', 'Ằ': 'AA',
      'ẳ': 'aa', 'Ẳ': 'AA', 'ẵ': 'aa', 'Ẵ': 'AA',
      'ặ': 'aa', 'Ặ': 'AA',
      // â and â with tones
      'â': 'aa', 'Â': 'AA',
      'ấ': 'aa', 'Ấ': 'AA', 'ầ': 'aa', 'Ầ': 'AA',
      'ẩ': 'aa', 'Ẩ': 'AA', 'ẫ': 'aa', 'Ẫ': 'AA',
      'ậ': 'aa', 'Ậ': 'AA',
      // ê and ê with tones
      'ê': 'ee', 'Ê': 'EE',
      'ế': 'ee', 'Ế': 'EE', 'ề': 'ee', 'Ề': 'EE',
      'ể': 'ee', 'Ể': 'EE', 'ễ': 'ee', 'Ễ': 'EE',
      'ệ': 'ee', 'Ệ': 'EE',
      // ô and ô with tones
      'ô': 'oo', 'Ô': 'OO',
      'ố': 'oo', 'Ố': 'OO', 'ồ': 'oo', 'Ồ': 'OO',
      'ổ': 'oo', 'Ổ': 'OO', 'ỗ': 'oo', 'Ỗ': 'OO',
      'ộ': 'oo', 'Ộ': 'OO',
      // á, à, ả, ã, ạ and uppercase
      'á': 'as', 'Á': 'AS', 'à': 'af', 'À': 'AF',
      'ả': 'ar', 'Ả': 'AR', 'ã': 'ax', 'Ã': 'AX',
      'ạ': 'aj', 'Ạ': 'AJ',
      // é, è, ẻ, ẽ, ẹ and uppercase
      'é': 'es', 'É': 'ES', 'è': 'ef', 'È': 'EF',
      'ẻ': 'er', 'Ẻ': 'ER', 'ẽ': 'ex', 'Ẽ': 'EX',
      'ẹ': 'ej', 'Ẹ': 'EJ',
      // í, ì, ỉ, ĩ, ị and uppercase
      'í': 'is', 'Í': 'IS', 'ì': 'if', 'Ì': 'IF',
      'ỉ': 'ir', 'Ỉ': 'IR', 'ĩ': 'ix', 'Ĩ': 'IX',
      'ị': 'ij', 'Ị': 'IJ',
      // ó, ò, ỏ, õ, ọ and uppercase
      'ó': 'os', 'Ó': 'OS', 'ò': 'of', 'Ò': 'OF',
      'ỏ': 'or', 'Ỏ': 'OR', 'õ': 'ox', 'Õ': 'OX',
      'ọ': 'oj', 'Ọ': 'OJ',
      // ú, ù, ủ, ũ, ụ and uppercase
      'ú': 'us', 'Ú': 'US', 'ù': 'uf', 'Ù': 'UF',
      'ủ': 'ur', 'Ủ': 'UR', 'ũ': 'ux', 'Ũ': 'UX',
      'ụ': 'uj', 'Ụ': 'UJ',
      // ý, ỳ, ỷ, ỹ, ỵ and uppercase
      'ý': 'ys', 'Ý': 'YS', 'ỳ': 'yf', 'Ỳ': 'YF',
      'ỷ': 'yr', 'Ỷ': 'YR', 'ỹ': 'yx', 'Ỹ': 'YX',
      'ỵ': 'yj', 'Ỵ': 'YJ',
    };

    let result = text;
    
    // Replace Vietnamese characters with ASCII equivalents
    for (const [vietnamese, ascii] of Object.entries(vietnameseMap)) {
      result = result.replace(new RegExp(vietnamese, 'g'), ascii);
    }

    // Normalize remaining accented characters to their base ASCII equivalents
    // This handles any other accented characters not in the map above
    result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return result;
  };

  // Handle input change - clear tab suggestions when user types and update inline autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Convert Vietnamese Unicode to ASCII in real-time
    const newValue = vietnameseToAscii(rawValue);
    
    // If conversion changed the value, update the input and preserve cursor position
    if (newValue !== rawValue && inputRef.current) {
      const input = inputRef.current;
      const cursorPosition = input.selectionStart || 0;
      const lengthDiff = newValue.length - rawValue.length;
      
      // Update the value
      setCurrentInput(newValue);
      
      // Restore cursor position after state update
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPosition = Math.max(0, Math.min(cursorPosition + lengthDiff, newValue.length));
          inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    } else {
      setCurrentInput(newValue);
    }
    
    // Clear tab suggestions when user modifies input
    if (tabSuggestions.length > 0) {
      setTabSuggestions([]);
      setTabSuggestionIndex(-1);
    }
    
    // Clear command accepted flag when user types
    setCommandAccepted(false);
    
    // Update inline autocomplete
    const autocomplete = getInlineAutocomplete(newValue);
    setInlineAutocomplete(autocomplete);
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
      
      // Update inline autocomplete after tab completion
      // If command was fully accepted (single match), autocomplete will be cleared in handleTabCompletion
      const autocomplete = getInlineAutocomplete(completed);
      setInlineAutocomplete(autocomplete);
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
      // Clear tab suggestions and inline autocomplete when navigating history
      setTabSuggestions([]);
      setTabSuggestionIndex(-1);
      setInlineAutocomplete(null);
      if (commandHistoryList.length > 0) {
        const newIndex = historyIndex === -1 
          ? commandHistoryList.length - 1 
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        const newInput = commandHistoryList[newIndex];
        setCurrentInput(newInput);
        // Update inline autocomplete for the history command
        const autocomplete = getInlineAutocomplete(newInput);
        setInlineAutocomplete(autocomplete);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Clear tab suggestions and inline autocomplete when navigating history
      setTabSuggestions([]);
      setTabSuggestionIndex(-1);
      setInlineAutocomplete(null);
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistoryList.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
          setInlineAutocomplete(null);
        } else {
          setHistoryIndex(newIndex);
          const newInput = commandHistoryList[newIndex];
          setCurrentInput(newInput);
          // Update inline autocomplete for the history command
          const autocomplete = getInlineAutocomplete(newInput);
          setInlineAutocomplete(autocomplete);
        }
      }
    } else if (e.key === 'Enter') {
      // Clear inline autocomplete on Enter
      setInlineAutocomplete(null);
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
            <div className={`w-full h-full ${isMobile ? 'rounded-lg' : 'rounded-t-lg'} flex flex-col overflow-hidden relative transition-colors backdrop-blur-md ${
              theme === 'dark' 
                ? 'bg-[#2d2d2d]/60 border border-[#1a1a1a]/80 shadow-[0_20px_60px_rgba(0,0,0,0.5)]' 
                : 'bg-[#f5f5f5]/60 border border-[#d0d0d0]/80 shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
            }`}>
              {/* macOS Title Bar */}
              <div
                ref={headerRef}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleHeaderDoubleClick}
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
                className={`flex items-center justify-between px-3 md:px-4py-2 py-2 md:py-2.5 border-t border-l border-r border-accent/40 select-none ${isMobile ? 'rounded-t-lg' : 'rounded-t-lg'} transition-colors ${
                  isMobile ? '' : 'cursor-grab active:cursor-grabbing'
                } ${
                  theme === 'dark'
                    ? 'bg-[#3a3a3a]/2'
                    : 'bg-[#e8e8e8]/2'
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
                    onClick={handleMinimize}
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
                className={`flex-1 font-mono text-xs md:text-sm overflow-auto p-3 md:p-4 transition-colors cursor-text border border-accent/40 ${
                  theme === 'dark'
                    ? 'bg-background/60 text-[#d0d0d0]'
                    : 'bg-[#ffffff]/60 text-[#000000]'
                }`}
              >
                <div className="space-y-1">
                  {/* Command History */}
                  {commandHistory.map((item, index) => (
                    <div key={index} className="mb-1">
                      {item.type === 'command' && (
                        <div className='flex items-center'>
                          <div className='w-4 h-[26px] rounded-l-md border-l border-t border-b border-accent'></div>
                          <div className="flex flex-col gap-0.5 w-full">
                            {/* First line: User label */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`flex items-center gap-1 ${item.isRoot ? 'text-red-500' : (theme === 'dark' ? 'text-[#5fd7ff]' : 'text-[#0066cc]')}`}>
                                <span className={item.isRoot ? 'text-red-500' : 'text-accent'}><FaApple size={16} /></span>
                                <span className="mt-1">{item.isRoot ? 'root@portfolio' : 'user@portfolio'}</span>
                                <span className="mt-1 text-text-secondary">|</span>
                                <span className="mt-1 text-base text-green-500">~</span>
                                <span className="mt-1 text-sm font-mono text-green-500">{getDisplayPath(item.pathname)}</span>
                              </span>
                              <div 
                                className="mt-1 flex-1"
                                style={{
                                  backgroundImage: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(171, 178, 191, 0.6)' : 'rgba(107, 114, 128, 0.6)'} 2px, transparent 2px)`,
                                  backgroundSize: '10px 10px',
                                  backgroundPosition: '0 50%',
                                  backgroundRepeat: 'repeat-x',
                                  height: '4px'
                                }}
                              ></div>
                              <div className='mt-1 text-text-secondary'>|</div>
                              {/* <div className={`mt-1 text-md font-semibold text-green-500 font-mono ${theme === 'dark' ? 'text-[#d0d0d0]' : 'text-[#000000]'}`}>
                                {currentTime}
                              </div>
                              <div className='mt-1 text-text-secondary'>|</div> */}
                              <div className='mt-1 text-green-500 font-semibold font-momo'>webshell</div>
                            </div>
                            {/* Second line: Command with prompt */}
                            <div className="-ml-1 flex items-center gap-2 mb-2">
                              <span className={item.isRoot ? 'text-red-500' : (theme === 'dark' ? 'text-[#5fd7ff]' : 'text-[#0066cc]')}>
                                <RiArrowRightWideLine size={16} />
                              </span>
                              <span className={item.isAccepted ? 'text-green-500' : (theme === 'dark' ? 'text-[#d0d0d0]' : 'text-[#000000]')}>
                                {item.content}
                              </span>
                            </div>
                          </div>
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

                  {/* Input Line - Two-line layout */}
                  {!isPasswordPrompt ? (
                    <div className='flex items-center'>
                      <div className='w-4 h-[26px] rounded-l-md border-l border-t border-b border-accent'></div>
                      <form onSubmit={handleSubmit} className="flex flex-col gap-0.5 w-full">
                        {/* First line: User label */}
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`flex items-center gap-1 ${isRoot ? 'text-red-500' : (theme === 'dark' ? 'text-[#5fd7ff]' : 'text-[#0066cc]')}`}>
                            <span className={isRoot ? 'text-red-500' : 'text-accent'}><FaApple size={16} /></span>
                            <span className="mt-1">{isRoot ? 'root@portfolio' : 'user@portfolio'}</span>
                            <span className="mt-1 text-text-secondary">|</span>
                            <span className="mt-1 text-base text-green-500">~</span>
                            <span className="mt-1 text-sm font-mono text-green-500">{getDisplayPath()}</span>
                          </div>
                          <div 
                            className="mt-1 flex-1"
                            style={{
                              backgroundImage: `radial-gradient(circle, ${theme === 'dark' ? 'rgba(171, 178, 191, 0.6)' : 'rgba(107, 114, 128, 0.6)'} 2px, transparent 2px)`,
                              backgroundSize: '10px 10px',
                              backgroundPosition: '0 50%',
                              backgroundRepeat: 'repeat-x',
                              height: '4px'
                            }}
                          ></div>
                          <div className='mt-1 text-text-secondary'>|</div>
                          <div className={`mt-1 text-md font-semibold text-green-500 font-mono ${theme === 'dark' ? 'text-[#d0d0d0]' : 'text-[#000000]'}`}>
                            {currentTime}
                          </div>
                          <div className='mt-1 text-text-secondary'>|</div>
                          <div className='mt-1 text-green-500 font-semibold font-momo'>webshell</div>
                        </div>
                        {/* Second line: Input field with prompt */}
                        <div className="-ml-1 flex items-center gap-2 mb-2">
                          <span className={isRoot ? 'text-red-500' : (theme === 'dark' ? 'text-[#5fd7ff]' : 'text-[#0066cc]')}>
                            <RiArrowRightWideLine size={16} />
                          </span>
                          {isExecuting && (
                            <span className={`text-xs ${theme === 'dark' ? 'text-[#666666]' : 'text-[#666666]'}`}>
                              executing...
                            </span>
                          )}
                          <div className="flex-1 relative flex items-center min-w-0">
                            <div className="relative w-full flex items-center">
                              <input
                                ref={inputRef}
                                type="text"
                                value={currentInput}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={isExecuting}
                                className={`w-full bg-transparent border-none outline-none relative z-10 ${
                                  commandAccepted 
                                    ? 'text-green-500' 
                                    : (theme === 'dark' ? 'text-[#d0d0d0]' : 'text-[#000000]')
                                } ${isExecuting ? 'opacity-50 cursor-wait' : ''}`}
                                autoFocus
                                autoComplete="off"
                                spellCheck="false"
                              />
                              {/* Inline autocomplete suggestion - positioned after input text */}
                              {inlineAutocomplete && (
                                <span 
                                  className="absolute left-0 pointer-events-none whitespace-pre font-mono"
                                  style={{
                                    fontFamily: 'inherit',
                                    fontSize: 'inherit',
                                    lineHeight: 'inherit',
                                  }}
                                >
                                  <span className="opacity-0">{currentInput}</span>
                                  <span className={theme === 'dark' ? 'text-[#666666]/60' : 'text-[#666666]/60'}>
                                    {inlineAutocomplete.unmatched}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  ) : (
                    /* Hidden password input - completely invisible but functional */
                    <form onSubmit={handleSubmit} style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                      <input
                        ref={inputRef}
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setIsPasswordPrompt(false);
                            setPasswordInput('');
                            setCurrentInput('');
                            // Add cancellation message
                            setCommandHistory(prev => {
                              const newHistory: CommandOutput[] = [
                                ...prev,
                                { type: 'error' as const, content: 'Password entry cancelled.' }
                              ];
                              return limitHistory(newHistory);
                            });
                          }
                        }}
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                        style={{ width: '1px', height: '1px', opacity: 0 }}
                      />
                    </form>
                  )}

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
