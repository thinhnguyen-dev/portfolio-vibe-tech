'use client';

import React from 'react';
import Link from 'next/link';

interface NavLinkProps {
  href: string;
  label: string;
  isActive?: boolean;
}

export const NavLink: React.FC<NavLinkProps> = ({ href, label, isActive = false }) => {
  return (
    <Link
      href={href}
      className="flex items-center gap-0 hover:opacity-80 transition-opacity text-lg leading-[21px]"
    >
      <span className={isActive ? 'text-foreground' : 'text-text-secondary'}>
        {label}
      </span>
    </Link>
  );
};
