import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  /** Use 'light' on dark backgrounds, like the footer. */
  variant?: 'default' | 'light';
  className?: string;
}

const Logo = ({ size = 'md', showText = true, variant = 'default', className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const colors =
    variant === 'light'
      ? { leaf: '#F5EFE0', vein: '#173D2B', veinOpacity: 0.3, accent: '#D9A441', market: '#F5EFE0', link: '#D9A441' }
      : { leaf: '#173D2B', vein: '#FBF8F1', veinOpacity: 0.55, accent: '#B08628', market: '#173D2B', link: '#B08628' };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="55 45 290 300" className={sizeClasses[size]} xmlns="http://www.w3.org/2000/svg">
        <path d="M142,330 C70,292 68,148 146,98 C160,150 158,288 142,330 Z" fill={colors.leaf} />
        <path d="M144,320 C138,250 138,170 148,108" fill="none" stroke={colors.vein} strokeWidth="2.5" opacity={colors.veinOpacity} />
        <path d="M258,330 C330,292 332,148 254,98 C240,150 242,288 258,330 Z" fill={colors.leaf} />
        <path d="M256,320 C262,250 262,170 252,108" fill="none" stroke={colors.vein} strokeWidth="2.5" opacity={colors.veinOpacity} />
        <path d="M148,108 Q200,58 252,108" fill="none" stroke={colors.accent} strokeWidth="7" strokeLinecap="round" />
        <circle cx="200" cy="83" r="11" fill={colors.accent} />
      </svg>
      {showText && (
        <span className={`${textSizeClasses[size]} font-bold`}>
          <span style={{ color: colors.market }}>Market</span>
          <span style={{ color: colors.link }}>Link</span>
          <span style={{ color: colors.market }}> Nigeria</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
