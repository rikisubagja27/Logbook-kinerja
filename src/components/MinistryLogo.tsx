import React from 'react';

interface MinistryLogoProps {
  className?: string;
  size?: number;
}

export const MinistryLogo: React.FC<MinistryLogoProps> = ({ className = '', size = 110 }) => {
  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo_kementan.svg"
        alt="Logo Kementerian Pertanian Republik Indonesia"
        width={size}
        height={size}
        className="w-full h-full object-contain drop-shadow-xs"
        loading="eager"
      />
    </div>
  );
};
