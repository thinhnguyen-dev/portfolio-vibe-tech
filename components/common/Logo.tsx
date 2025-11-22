import React from 'react';

export const Logo: React.FC = () => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* Grid pattern based on Figma rectangles */}
      <rect x="8" y="0" width="4" height="4" fill="currentColor" />
      <rect x="12" y="8" width="4" height="4" fill="currentColor" />
      <rect x="12" y="4" width="4" height="4" fill="currentColor" />
      <rect x="12" y="0" width="4" height="4" fill="currentColor" />
      <rect x="8" y="8" width="4" height="4" fill="currentColor" />
      <rect x="4" y="4" width="4" height="4" fill="currentColor" />
      <rect x="0" y="4" width="4" height="4" fill="currentColor" />
      <rect x="0" y="8" width="4" height="4" fill="currentColor" />
      <rect x="0" y="12" width="4" height="4" fill="currentColor" />
      <rect x="4" y="12" width="4" height="4" fill="currentColor" />
    </svg>
  );
};
