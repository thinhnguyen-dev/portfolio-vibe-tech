import React from 'react';
import Link from 'next/link';

interface ButtonProps {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  href, 
  children, 
  onClick, 
  className = '' 
}) => {
  // Button from Figma: 148x37, padding: 16px horizontal (text at x:16), itemSpacing: 10
  const baseClasses = 'inline-flex items-center gap-2.5 px-4 py-2 h-[37px] border border-accent text-foreground hover:bg-accent/10 transition-colors text-base leading-[21px] font-medium whitespace-nowrap';
  
  const content = (
    <>
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick} 
      className={`${baseClasses} ${className}`}
    >
      {content}
    </button>
  );
};
