import React from 'react';

interface StatusBarProps {
  text: string;
  className?: string;
  highlightText?: string;
  highlightColor?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ text, className = '', highlightText, highlightColor = 'text-accent' }) => {
  // StatusBar from Figma: 402x37, gap:10, padding: 8px horizontal, icon: 16x16
  // Responsive: smaller on mobile, full size on desktop
  return (
    <div 
      className={`inline-flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-2 py-1.5 sm:py-2 w-full text-wrap h-auto sm:h-[37px] bg-background border border-text-secondary ${className}`}
    >
      {/* Purple square icon - responsive size: 12x12 on mobile, 16x16 on desktop */}
      <div className="w-3 h-3 sm:w-4 sm:h-4 bg-accent border border-accent shrink-0" />
      <p className="text-foreground text-sm sm:text-base leading-[18px] sm:leading-[21px] sm:whitespace-nowrap">
        {text} {highlightText && <span className={`${highlightColor}`}>{highlightText}</span>}
      </p>
    </div>
  );
};
