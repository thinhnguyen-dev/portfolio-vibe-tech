import React from 'react';

interface StatusBarProps {
  text: string;
  className?: string;
  highlightText?: string;
  highlightColor?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ text, className = '', highlightText, highlightColor = 'text-accent' }) => {
  // StatusBar from Figma: 402x37, gap:10, padding: 8px horizontal, icon: 16x16
  return (
    <div 
      className={`inline-flex items-center gap-2.5 px-2 py-2 h-[37px] bg-background border border-text-secondary ${className}`}
    >
      {/* Purple square icon - 16x16 from Figma */}
      <div className="w-4 h-4 bg-accent border border-accent shrink-0" />
      <span className="text-foreground text-base leading-[21px] whitespace-nowrap">
        {text} {highlightText && <span className={`${highlightColor}`}>{highlightText}</span>}
      </span>
    </div>
  );
};
