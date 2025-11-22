'use client';

import React, { useState, useEffect, useRef } from 'react';

interface BackgroundProps {
  className?: string;
  opacity?: number;
}

export const Background: React.FC<BackgroundProps> = ({
  className = '',
  opacity = 0.12,
}) => {
  // Use accent color - #C778DD (same for both light and dark themes)
  const accentColor = 'rgb(199, 120, 221)';
  // Brighter, more vivid color for highlighted numbers
  const highlightColor = 'rgb(220, 140, 255)';
  // Even brighter color for cursor highlights (brightest)
  const cursorHighlightColor = 'rgb(255, 180, 255)';
  
  const textOpacity = opacity * 1.5;
  
  // Mouse position in SVG coordinates
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Interaction radius (in viewBox units - 2400x1200)
  const cursorRadius = 150;

  // Deterministic hash function for consistent patterns
  const hash = (x: number, y: number) => {
    const n = x * 374761393 + y * 668265263;
    return ((n ^ (n >> 13)) * 1274126177) % 1000 / 1000;
  };

  // Generate binary numbers in rows and columns with uneven distribution
  const binaryPattern = React.useMemo(() => {
    interface BinaryText {
      text: '0' | '1';
      x: number;
      y: number;
      opacity: number;
      size: number;
      responsiveGroup: 'all' | 'tablet+' | 'desktop+';
      highlighted: boolean;
      highlightDelay: number;
    }

    const binaryTexts: BinaryText[] = [];
    
    // Helper to round coordinates for consistent hydration
    const roundCoord = (value: number) => Math.round(value * 100) / 100;

    // Grid parameters - uneven distribution
    const startX = 100;
    const startY = 100;
    const endX = 2300;
    const endY = 1100;
    const width = endX - startX;
    const height = endY - startY;

    // MOBILE: Very sparse grid - optimized for mobile performance
    const mobileColSpacing = 220; // Increased spacing for fewer elements
    const mobileRowSpacing = 180; // Increased spacing for fewer elements
    const mobileCols = Math.floor(width / mobileColSpacing);
    const mobileRows = Math.floor(height / mobileRowSpacing);

    for (let row = 0; row < mobileRows; row++) {
      for (let col = 0; col < mobileCols; col++) {
        // Uneven distribution - more sparse for mobile (70% skip rate - increased numbers)
        const cellHash = hash(row * 1000, col * 1000);
        const skipProbability = 0.70; // 70% chance to skip cell for mobile (was 75%)
        
        if (cellHash > skipProbability) {
          // Reduced spacing variation for mobile
          const colOffset = (hash(row * 2000, col * 2000) - 0.5) * 30;
          const rowOffset = (hash(row * 3000, col * 3000) - 0.5) * 25;
          
          const x = startX + col * mobileColSpacing + colOffset + mobileColSpacing / 2;
          const y = startY + row * mobileRowSpacing + rowOffset + mobileRowSpacing / 2;
          
          const binaryValue = hash(x, y) > 0.5 ? '1' : '0';
          const sizeVariation = hash(x * 3000, y * 3000);
          // Increased sizes for mobile (19-25px - increased by ~3px)
          const size = Math.round((19 + sizeVariation * 6) * 10) / 10;
          
          // Opacity based on position - center area slightly brighter
          const centerX = (startX + endX) / 2;
          const centerY = (startY + endY) / 2;
          const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
          const distanceOpacity = Math.max(0.5, 1 - (distFromCenter / maxDist) * 0.4);
          const opacityVariation = hash(x * 5000, y * 5000) * 0.2;
          // Slightly higher opacity for mobile visibility
          const finalOpacity = Math.round((textOpacity * distanceOpacity * (0.9 + opacityVariation)) * 1000) / 1000;
          
          if (x > 80 && x < 2320 && y > 80 && y < 1120) {
            // Determine if this number should be highlighted (~30% chance)
            const highlightHash = hash(x * 7000, y * 7000);
            const highlighted = highlightHash > 0.70;
            const highlightDelay = (hash(x * 8000, y * 8000) * 3); // Delay 0-3 seconds
            
            binaryTexts.push({
              text: binaryValue,
              x: roundCoord(x),
              y: roundCoord(y),
              opacity: finalOpacity,
              size: size,
              responsiveGroup: 'all',
              highlighted,
              highlightDelay: Math.round(highlightDelay * 100) / 100,
            });
          }
        }
      }
    }

    // TABLET+: Medium density grid - every 2nd-3rd cell
    const tabletColSpacing = 140;
    const tabletRowSpacing = 120;
    const tabletCols = Math.floor(width / tabletColSpacing);
    const tabletRows = Math.floor(height / tabletRowSpacing);

    for (let row = 0; row < tabletRows; row++) {
      for (let col = 0; col < tabletCols; col++) {
        // Skip if already in mobile grid
        const cellX = startX + col * tabletColSpacing + tabletColSpacing / 2;
        const cellY = startY + row * tabletRowSpacing + tabletRowSpacing / 2;
        const cellHash = hash(row * 5000, col * 5000);
        
        // Check if too close to existing mobile numbers
        let tooClose = false;
        for (const existing of binaryTexts) {
          if (existing.responsiveGroup === 'all') {
            const dist = Math.sqrt((cellX - existing.x) ** 2 + (cellY - existing.y) ** 2);
            if (dist < 60) {
              tooClose = true;
              break;
            }
          }
        }
        
        const skipProbability = 0.50; // 50% chance to skip (was 55% - increased numbers)
        
        if (!tooClose && cellHash > skipProbability) {
          const colOffset = (hash(row * 6000, col * 6000) - 0.5) * 35;
          const rowOffset = (hash(row * 7000, col * 7000) - 0.5) * 25;
          
          const x = cellX + colOffset;
          const y = cellY + rowOffset;
          
          const binaryValue = hash(x, y) > 0.5 ? '1' : '0';
          const sizeVariation = hash(x * 3000, y * 3000);
          // Increased sizes for tablet+ (21-28px - increased by ~3px)
          const size = Math.round((21 + sizeVariation * 7) * 10) / 10;
          
          const centerX = (startX + endX) / 2;
          const centerY = (startY + endY) / 2;
          const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
          const distanceOpacity = Math.max(0.35, 1 - (distFromCenter / maxDist) * 0.5);
          const opacityVariation = hash(x * 5000, y * 5000) * 0.25;
          const finalOpacity = Math.round((textOpacity * distanceOpacity * (0.75 + opacityVariation)) * 1000) / 1000;
          
          // Determine if tablet+ or desktop+
          const responsiveGroup = (row + col) % 3 === 0 ? 'tablet+' : 'desktop+';
          
          if (x > 80 && x < 2320 && y > 80 && y < 1120) {
            // Determine if this number should be highlighted (~30% chance)
            const highlightHash = hash(x * 7000, y * 7000);
            const highlighted = highlightHash > 0.70;
            const highlightDelay = (hash(x * 8000, y * 8000) * 3); // Delay 0-3 seconds
            
            binaryTexts.push({
              text: binaryValue,
              x: roundCoord(x),
              y: roundCoord(y),
              opacity: finalOpacity,
              size: size,
              responsiveGroup,
              highlighted,
              highlightDelay: Math.round(highlightDelay * 100) / 100,
            });
          }
        }
      }
    }

    // DESKTOP+: Dense grid with more variation - every 1.5th-2nd cell
    const desktopColSpacing = 100;
    const desktopRowSpacing = 90;
    const desktopCols = Math.floor(width / desktopColSpacing);
    const desktopRows = Math.floor(height / desktopRowSpacing);

    for (let row = 0; row < desktopRows; row++) {
      for (let col = 0; col < desktopCols; col++) {
        const cellX = startX + col * desktopColSpacing + desktopColSpacing / 2;
        const cellY = startY + row * desktopRowSpacing + desktopRowSpacing / 2;
        const cellHash = hash(row * 10000, col * 10000);
        
        // Check if too close to existing numbers
        let tooClose = false;
        for (const existing of binaryTexts) {
          const dist = Math.sqrt((cellX - existing.x) ** 2 + (cellY - existing.y) ** 2);
          if (dist < 45) {
            tooClose = true;
            break;
          }
        }
        
        const skipProbability = 0.40; // 40% chance to skip - more dense (was 45% - increased numbers)
        
        if (!tooClose && cellHash > skipProbability) {
          const colOffset = (hash(row * 8000, col * 8000) - 0.5) * 30;
          const rowOffset = (hash(row * 9000, col * 9000) - 0.5) * 20;
          
          const x = cellX + colOffset;
          const y = cellY + rowOffset;
          
          const binaryValue = hash(x, y) > 0.5 ? '1' : '0';
          const sizeVariation = hash(x * 3000, y * 3000);
          // Increased sizes for desktop+ (19-25px - increased by ~3px)
          const size = Math.round((19 + sizeVariation * 6) * 10) / 10;
          
          const centerX = (startX + endX) / 2;
          const centerY = (startY + endY) / 2;
          const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);
          const distanceOpacity = Math.max(0.3, 1 - (distFromCenter / maxDist) * 0.5);
          const opacityVariation = hash(x * 5000, y * 5000) * 0.2;
          const finalOpacity = Math.round((textOpacity * distanceOpacity * (0.7 + opacityVariation)) * 1000) / 1000;
          
          if (x > 80 && x < 2320 && y > 80 && y < 1120) {
            // Determine if this number should be highlighted (~30% chance)
            const highlightHash = hash(x * 7000, y * 7000);
            const highlighted = highlightHash > 0.70;
            const highlightDelay = (hash(x * 8000, y * 8000) * 3); // Delay 0-3 seconds
            
            binaryTexts.push({
              text: binaryValue,
              x: roundCoord(x),
              y: roundCoord(y),
              opacity: finalOpacity,
              size: size,
              responsiveGroup: 'desktop+',
              highlighted,
              highlightDelay: Math.round(highlightDelay * 100) / 100,
            });
          }
        }
      }
    }

    return binaryTexts;
  }, [textOpacity]);
  
  // Track mouse position in SVG coordinates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      
      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox.baseVal;
      
      // Convert mouse coordinates to SVG viewBox coordinates
      const x = ((e.clientX - rect.left) / rect.width) * viewBox.width;
      const y = ((e.clientY - rect.top) / rect.height) * viewBox.height;
      
      setMousePosition({ x, y });
    };
    
    const handleMouseLeave = () => {
      setMousePosition(null);
    };
    
    // Only enable on desktop (not touch devices)
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);
  
  // Calculate if a binary number is near cursor
  const isNearCursor = (x: number, y: number): boolean => {
    if (!mousePosition) return false;
    const distance = Math.sqrt((x - mousePosition.x) ** 2 + (y - mousePosition.y) ** 2);
    return distance < cursorRadius;
  };

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 ${className}`}
      aria-hidden="true"
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 2400 1200"
        onMouseMove={(e) => {
          if (!svgRef.current) return;
          const rect = svgRef.current.getBoundingClientRect();
          const viewBox = svgRef.current.viewBox.baseVal;
          const x = ((e.clientX - rect.left) / rect.width) * viewBox.width;
          const y = ((e.clientY - rect.top) / rect.height) * viewBox.height;
          setMousePosition({ x, y });
        }}
        onMouseLeave={() => setMousePosition(null)}
      >
        <style>{`
          /* Mobile: show only 'all' group */
          .binary-group-tablet,
          .binary-group-desktop {
            display: none;
          }
          
          /* Tablet: show 'all' and 'tablet+' */
          @media (min-width: 768px) {
            .binary-group-tablet {
              display: block;
            }
          }
          
          /* Desktop: show all groups */
          @media (min-width: 1024px) {
            .binary-group-desktop {
              display: block;
            }
          }
          
          /* Subtle animation for dynamism */
          .binary-text {
            animation: binaryPulse 4s ease-in-out infinite;
            animation-delay: var(--delay);
          }
          
          @keyframes binaryPulse {
            0%, 100% {
              opacity: var(--base-opacity);
            }
            50% {
              opacity: calc(var(--base-opacity) * 1.3);
            }
          }
          
          /* Highlight animation for highlighted numbers */
          .binary-highlighted {
            filter: url(#highlightGlow);
            animation: highlightPulse 3s ease-in-out infinite;
            animation-delay: var(--highlight-delay);
          }
          
          @keyframes highlightPulse {
            0%, 100% {
              opacity: var(--base-opacity);
              filter: url(#highlightGlow);
            }
            50% {
              opacity: calc(var(--base-opacity) * 2.5);
              filter: url(#highlightGlow);
            }
          }
          
          /* Disable highlight glow on mobile for performance */
          @media (max-width: 767px) {
            .binary-highlighted {
              filter: none !important;
              animation: highlightPulseMobile 4s ease-in-out infinite;
            }
            
            @keyframes highlightPulseMobile {
              0%, 100% {
                opacity: var(--base-opacity);
              }
              50% {
                opacity: calc(var(--base-opacity) * 2.2);
              }
            }
          }
          
          /* Cursor interaction highlight - brighter than regular highlights */
          .binary-cursor-highlight {
            fill: var(--cursor-highlight-color, ${cursorHighlightColor}) !important;
            opacity: calc(var(--base-opacity) * 4) !important;
            filter: url(#cursorHighlightGlow) !important;
            transition: opacity 0.2s ease-out, fill 0.2s ease-out, filter 0.2s ease-out;
          }
          
          @media (min-width: 768px) {
            .binary-cursor-highlight {
              transition: opacity 0.15s ease-out, fill 0.15s ease-out, filter 0.15s ease-out;
              opacity: calc(var(--base-opacity) * 4.5) !important;
            }
          }
          
          @media (max-width: 767px) {
            .binary-cursor-highlight {
              filter: none !important;
              opacity: calc(var(--base-opacity) * 2.5) !important;
            }
          }
          
          /* Mobile: optimized sizing and animations */
          @media (max-width: 767px) {
            .binary-text {
              font-size: calc(var(--text-size) * 0.8);
              animation-duration: 5s;
              will-change: opacity;
            }
            
            /* Disable glow filter on mobile for better performance */
            .binary-text {
              filter: none !important;
            }
          }
          
          /* Small mobile devices (phones in portrait) */
          @media (max-width: 480px) {
            .binary-text {
              font-size: calc(var(--text-size) * 0.75);
              animation-duration: 6s;
            }
          }
          
          /* Apply glow filter only on tablet+ */
          .binary-glow {
            filter: url(#binaryGlow);
          }
          
          @media (max-width: 767px) {
            .binary-glow {
              filter: none !important;
            }
          }
        `}</style>
        <defs>
          {/* Subtle glow filter for enhanced visibility */}
          <filter id="binaryGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" in="SourceGraphic" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Enhanced vivid glow filter for highlighted numbers */}
          <filter id="highlightGlow" x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" in="SourceGraphic" />
            <feComponentTransfer in="coloredBlur" result="brighterBlur">
              <feFuncA type="linear" slope="2" intercept="0"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="brighterBlur" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Brightest glow filter for cursor highlights */}
          <filter id="cursorHighlightGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur" in="SourceGraphic" />
            <feComponentTransfer in="coloredBlur" result="brighterBlur">
              <feFuncA type="linear" slope="3.5" intercept="0"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="brighterBlur" />
              <feMergeNode in="brighterBlur" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Binary numbers in rows and columns */}
        <g className="binary-numbers">
          {/* Mobile: all devices */}
          <g className="binary-group-all">
            {binaryPattern
              .filter((item) => item.responsiveGroup === 'all')
              .map((item, index) => {
                const delay = (index * 0.1) % 4;
                return (
                  <text
                    key={`binary-all-${index}`}
                    x={item.x}
                    y={item.y}
                    fill={item.highlighted ? highlightColor : accentColor}
                    fontSize={item.size}
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`binary-text binary-glow ${item.highlighted ? 'binary-highlighted' : ''} ${isNearCursor(item.x, item.y) ? 'binary-cursor-highlight' : ''}`}
                    style={{
                      opacity: item.opacity,
                      '--base-opacity': item.opacity,
                      '--delay': `${delay}s`,
                      '--highlight-delay': `${item.highlightDelay}s`,
                      '--text-size': `${item.size}px`,
                      '--cursor-highlight-color': cursorHighlightColor,
                    } as React.CSSProperties}
                  >
                    {item.text}
                  </text>
                );
              })}
          </g>

          {/* Tablet and up */}
          <g className="binary-group-tablet">
            {binaryPattern
              .filter((item) => item.responsiveGroup === 'tablet+')
              .map((item, index) => {
                const delay = (index * 0.08) % 4;
                return (
                  <text
                    key={`binary-tablet-${index}`}
                    x={item.x}
                    y={item.y}
                    fill={item.highlighted ? highlightColor : accentColor}
                    fontSize={item.size}
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`binary-text binary-glow ${item.highlighted ? 'binary-highlighted' : ''} ${isNearCursor(item.x, item.y) ? 'binary-cursor-highlight' : ''}`}
                    style={{
                      opacity: item.opacity,
                      '--base-opacity': item.opacity,
                      '--delay': `${delay}s`,
                      '--highlight-delay': `${item.highlightDelay}s`,
                      '--text-size': `${item.size}px`,
                      '--cursor-highlight-color': cursorHighlightColor,
                    } as React.CSSProperties}
                  >
                    {item.text}
                  </text>
                );
              })}
          </g>

          {/* Desktop only */}
          <g className="binary-group-desktop">
            {binaryPattern
              .filter((item) => item.responsiveGroup === 'desktop+')
              .map((item, index) => {
                const delay = (index * 0.06) % 4;
                return (
                  <text
                    key={`binary-desktop-${index}`}
                    x={item.x}
                    y={item.y}
                    fill={item.highlighted ? highlightColor : accentColor}
                    fontSize={item.size}
                    fontFamily="monospace"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`binary-text binary-glow ${item.highlighted ? 'binary-highlighted' : ''} ${isNearCursor(item.x, item.y) ? 'binary-cursor-highlight' : ''}`}
                    style={{
                      opacity: item.opacity,
                      '--base-opacity': item.opacity,
                      '--delay': `${delay}s`,
                      '--highlight-delay': `${item.highlightDelay}s`,
                      '--text-size': `${item.size}px`,
                      '--cursor-highlight-color': cursorHighlightColor,
                    } as React.CSSProperties}
                  >
                    {item.text}
                  </text>
                );
              })}
          </g>
        </g>
      </svg>
    </div>
  );
};
