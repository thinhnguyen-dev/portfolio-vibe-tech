'use client';

import React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { IoListOutline, IoCloseOutline } from 'react-icons/io5';
import { extractTextFromMarkdown, extractHeadersFromMarkdown } from '@/lib/blog/id-utils';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Extract headers from markdown content using useMemo
  // Only includes root-level headers, excluding those in code blocks, blockquotes, etc.
  const tocItems = useMemo<TocItem[]>(() => {
    if (!content) return [];

    // Use the utility function to extract headers (excludes nested ones)
    const headers = extractHeadersFromMarkdown(content);
    const items: TocItem[] = [];
    // const idGenerator = new HeadingIdGenerator();

    headers.forEach(({ level, text: rawText }) => {
      // Extract plain text (remove markdown formatting)
      const text = extractTextFromMarkdown(rawText);
      
      // Generate ID using shared utility function (with duplicate handling)
    //   const id = idGenerator.generate(text);
      items.push({ id: text + '-' + level, text, level });
    });

    return items;
  }, [content]);

  // Set up intersection observer to detect active section
  useEffect(() => {
    if (tocItems.length === 0) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that's most visible and closest to the top
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // Sort by position (top to bottom)
          visibleEntries.sort((a, b) => {
            const aTop = a.boundingClientRect.top;
            const bTop = b.boundingClientRect.top;
            return aTop - bTop;
          });

          // Get the first visible entry (closest to top)
          const topEntry = visibleEntries[0];
          if (topEntry && topEntry.target.id) {
            setActiveId(topEntry.target.id);
          }
        } else {
          // If no entries are visible, find the one that's just above the viewport
          const allEntries = entries.sort((a, b) => {
            const aTop = a.boundingClientRect.top;
            const bTop = b.boundingClientRect.top;
            return bTop - aTop; // Sort descending (bottom to top)
          });

          // Find the first entry that's above the viewport
          const aboveViewport = allEntries.find(
            (entry) => entry.boundingClientRect.top < 0
          );

          if (aboveViewport && aboveViewport.target.id) {
            setActiveId(aboveViewport.target.id);
          }
        }
      },
      {
        rootMargin: '-20% 0px -70% 0px', // Trigger when header is in top 20% of viewport
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe all header elements
    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    observerRef.current = observer;

    // Set initial active ID after observer is set up (deferred to avoid sync setState)
    if (tocItems.length > 0) {
      // Use setTimeout to defer state update outside of effect body
      setTimeout(() => {
        const firstHeader = document.getElementById(tocItems[0].id);
        if (firstHeader) {
          // Check if it's actually visible before setting as active
          const rect = firstHeader.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= window.innerHeight * 0.2) {
            setActiveId(tocItems[0].id);
          }
        }
      }, 0);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [tocItems]);

  // Scroll to section when clicking TOC item
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Try to find the element by ID
    const element = document.getElementById(id);
    // If still not found, log for debugging
    if (!element) {
      console.warn(`Could not find element with id: ${id}`);
      // Try to find all headings to see what IDs exist
      const allHeadings = document.querySelectorAll('h1[id], h2[id], h3[id]');
      console.log('Available heading IDs:', Array.from(allHeadings).map(h => h.id));
      return;
    }
    
    // Calculate the position with proper offset
    const headerOffset = 120; // Offset to account for sticky elements and spacing
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    // Use smooth scrolling
    window.scrollTo({
      top: Math.max(0, offsetPosition), // Ensure we don't scroll to negative position
      behavior: 'smooth',
    });

    // Update the URL hash without triggering scroll
    window.history.pushState(null, '', `#${id}`);

    // Update active ID immediately for visual feedback
    setActiveId(id);
    
    // Also update after scroll completes (fallback)
    setTimeout(() => {
      setActiveId(id);
    }, 500);
  };

  if (tocItems.length === 0) {
    return null;
  }

  const tocContent = (
    <div
      className="border rounded-2xl p-4 transition-colors toc-container"
      style={{
        backgroundColor: 'var(--article-bg)',
        borderColor: 'var(--border-color)',
      }}
    >
      <h2
        className="text-lg font-bold mb-4 text-foreground flex items-center justify-between"
        style={{ color: 'var(--foreground)' }}
      >
        <div className='flex flex-col w-full gap-1'>
            <span className='w-full text-lg font-bold'>Table of Contents</span>
            <div className="w-full border-accent border-b"></div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden p-1 rounded transition-colors hover:bg-opacity-50"
          style={{
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
          aria-label="Close table of contents"
        >
          <IoCloseOutline size={20} />
        </button>
      </h2>
      <nav className="space-y-">
        {tocItems.map((item) => {
          const isActive = activeId === item.id;
          const indentClass =
            item.level === 1
              ? 'pl-0'
              : item.level === 2
              ? 'pl-6'
              : 'pl-12';

          return (
            <div key={item.id} className={`flex items-center gap-1 ${indentClass}`}>
                <div className='p-1 bg-accent border rounded-full'></div>
                <a
                href={`#${item.id + '-' + item.level}`}
                onClick={(e) => {
                        handleClick(e, item.id);
                        // Close mobile menu after clicking
                        if (window.innerWidth < 1024) {
                        setIsMobileMenuOpen(false);
                    }
                }}
                className={`truncate font-semibold block py-1.5 px-2 rounded text-sm transition-colors ${
                    isActive
                    ? 'font-extrabold'
                    : 'font-semibold hover:opacity-80'
                }`}
                style={{
                    color: isActive
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                    backgroundColor: isActive
                    ? 'var(--code-bg)'
                    : 'transparent',
                }}
                >
                {item.text}
                </a>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile/Tablet: Floating button */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 p-3 sm:p-4 rounded-full shadow-xl transition-all hover:scale-110 active:scale-95"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--background)',
            boxShadow: '0 10px 25px -5px rgba(199, 120, 221, 0.4), 0 4px 6px -2px rgba(199, 120, 221, 0.2)',
            zIndex: 100,
          }}
          aria-label="Open table of contents"
        >
          <IoListOutline size={20} className="sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Mobile/Tablet: Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ zIndex: 90 }}
        />
      )}

      {/* Mobile/Tablet: Drawer */}
      <div
        className={`lg:hidden fixed rounded-l-2xl top-0 right-0 h-full w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out overflow-y-auto toc-container ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--article-bg)',
          borderLeftColor: 'var(--border-color)',
          borderLeftWidth: '1px',
          zIndex: 100,
        }}
      >
        <div className="p-4">{tocContent}</div>
      </div>

      {/* Desktop: Sticky sidebar */}
      <div className="hidden lg:block w-full self-start">
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto toc-container">
          {tocContent}
        </div>
      </div>
    </>
  );
}

