import React from 'react';

export const DotsPattern: React.FC = () => {
  // 5x5 grid of dots, 4px each, 16px spacing
  const dots = Array.from({ length: 5 }, (_, i) => 
    Array.from({ length: 5 }, (_, j) => ({ x: j * 20, y: i * 20 }))
  ).flat();

  return (
    <svg
      width="84"
      height="84"
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {dots.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x + 2}
          cy={dot.y + 2}
          r="2"
          fill="currentColor"
          className="text-text-secondary"
        />
      ))}
    </svg>
  );
};
