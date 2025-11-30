'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { IoCopyOutline, IoCheckmarkOutline, IoChevronDownOutline, IoChevronUpOutline } from 'react-icons/io5';
import { toast } from 'react-toastify';

interface CodeBlockProps {
  children: string | React.ReactNode;
  className?: string;
  inline?: boolean;
}

export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const codeRef = useRef<HTMLDivElement>(null);

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                     !document.documentElement.classList.contains('light');
      setIsDarkTheme(isDark);
    };

    checkTheme();
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Extract language from className (e.g., "language-javascript" -> "javascript")
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  
  // Convert children to string
  const codeString = typeof children === 'string' 
    ? children.replace(/\n$/, '')
    : React.Children.toArray(children).join('').replace(/\n$/, '');

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      toast.success('Code copied to clipboard!', {
        autoClose: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  // Toggle collapse
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Inline code (not a code block)
  if (inline) {
    return (
      <code 
        className="px-1.5 py-0.5 rounded text-sm font-mono text-accent border transition-colors" 
        style={{ 
          backgroundColor: 'var(--code-bg)',
          borderColor: 'var(--border-color)'
        }}
      >
        {children}
      </code>
    );
  }

  // Code block with header
  return (
    <div 
      className="rounded-md border overflow-hidden transition-colors"
      style={{
        backgroundColor: 'var(--code-bg)',
        borderColor: 'var(--border-color)',
        boxShadow: isDarkTheme 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 0 20px rgba(199, 120, 221, 0.15)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 20px rgba(199, 120, 221, 0.12)',
      }}
      ref={codeRef}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b transition-colors"
        style={{
          background: isDarkTheme
            ? 'linear-gradient(to right, rgba(37, 40, 45, 1) 0%, rgba(199, 120, 221, 0.15) 50%, rgba(37, 40, 45, 1) 100%)'
            : 'linear-gradient(to right, rgba(249, 250, 251, 1) 0%, rgba(199, 120, 221, 0.12) 50%, rgba(249, 250, 251, 1) 100%)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-2">
            <button className="w-4 h-4 rounded-full bg-[#ff5f57] hover:bg-[#ff4747] transition-colors flex items-center justify-center group" aria-label="Close">
                <span className="w-1.5 h-1.5 rounded-full bg-[#740000] opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </button>
            <button className="w-4 h-4 rounded-full bg-[#ffbd2e] hover:bg-[#ffb400] transition-colors flex items-center justify-center group" aria-label="Minimize">
                <span className="w-1.5 h-1.5 rounded-full bg-[#995700] opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </button><button className="w-4 h-4 rounded-full bg-[#28c840] hover:bg-[#24b339] transition-colors flex items-center justify-center group" aria-label="Maximize">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006500] opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </button>
        </div>
        {/* Language Label */}
        <div className="flex items-center gap-2">
          <span 
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            {language}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded transition-colors flex items-center justify-center group"
            style={{
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--code-bg)';
              e.currentTarget.style.color = 'var(--foreground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Copy code"
            title="Copy code"
          >
            {copied ? (
              <IoCheckmarkOutline size={16} style={{ color: '#10b981' }} />
            ) : (
              <IoCopyOutline size={16} />
            )}
          </button>

          {/* Collapse Button */}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded transition-colors flex items-center justify-center group"
            style={{
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--code-bg)';
              e.currentTarget.style.color = 'var(--foreground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label={isCollapsed ? 'Expand code' : 'Collapse code'}
            title={isCollapsed ? 'Expand code' : 'Collapse code'}
          >
            {isCollapsed ? (
              <IoChevronDownOutline size={16} />
            ) : (
              <IoChevronUpOutline size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      {!isCollapsed && (
        <div className="relative overflow-x-auto code-block-wrapper">
          <SyntaxHighlighter
            language={language}
            style={isDarkTheme ? vscDarkPlus : vs}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              fontFamily: 'var(--font-fira-code), "Fira Code", monospace',
            }}
            showLineNumbers
            lineNumberStyle={{
              minWidth: '3em',
              paddingRight: '1em',
              color: 'var(--text-secondary)',
              opacity: 0.5,
              userSelect: 'none',
              textAlign: 'right',
            }}
            lineProps={() => ({
              style: {
                color: 'var(--foreground)',
              },
            })}
            codeTagProps={{
              style: {
                fontFamily: 'var(--font-fira-code), "Fira Code", monospace',
                color: 'var(--foreground)',
              },
            }}
            PreTag="div"
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

