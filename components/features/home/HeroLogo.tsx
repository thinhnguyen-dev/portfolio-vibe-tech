import React from 'react';

export const HeroLogo: React.FC = () => {
  return (
    <svg
      width="155"
      height="155"
      viewBox="0 0 155 155"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Left Union - purple stroke (#C778DD), white fill from Figma */}
      <g stroke="#C778DD" strokeWidth="1" fill="white">
        {/* Rectangle 16 */}
        <rect x="38.75" y="38.75" width="38.75" height="38.75" />
        {/* Rectangle 17 */}
        <rect x="0" y="38.75" width="38.75" height="38.75" />
        {/* Rectangle 18 */}
        <rect x="0" y="77.5" width="38.75" height="38.75" />
        {/* Rectangle 19 */}
        <rect x="0" y="116.25" width="38.75" height="38.75" />
        {/* Rectangle 20 */}
        <rect x="38.75" y="116.25" width="38.75" height="38.75" />
      </g>
      
      {/* Right Union - purple stroke (#C778DD), white fill from Figma */}
      <g stroke="#C778DD" strokeWidth="1" fill="white">
        {/* Rectangle 11 */}
        <rect x="77.5" y="0" width="38.75" height="38.75" />
        {/* Rectangle 12 */}
        <rect x="116.25" y="77.5" width="38.75" height="38.75" />
        {/* Rectangle 13 */}
        <rect x="116.25" y="38.75" width="38.75" height="38.75" />
        {/* Rectangle 14 */}
        <rect x="116.25" y="0" width="38.75" height="38.75" />
        {/* Rectangle 15 */}
        <rect x="77.5" y="77.5" width="38.75" height="38.75" />
      </g>
    </svg>
  );
};
