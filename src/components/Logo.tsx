
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const Logo = ({ size = 'md', showText = true, className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center shadow-lg`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-4/5 h-4/5 text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wheat/grain icon */}
          <path 
            d="M12 2L13.5 7.5L19 6L15.5 10.5L21 12L15.5 13.5L19 18L13.5 16.5L12 22L10.5 16.5L5 18L8.5 13.5L3 12L8.5 10.5L5 6L10.5 7.5L12 2Z" 
            fill="currentColor"
          />
          <path 
            d="M12 8V16M8 12H16" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
        </svg>
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-bold text-green-600`}>
          MarketLink Nigeria
        </span>
      )}
    </div>
  );
};

export default Logo;
