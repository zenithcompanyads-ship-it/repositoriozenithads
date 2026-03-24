'use client';

interface ZenithLogoProps {
  variant?: 'light' | 'dark' | 'gradient';
  size?: number;
  showText?: boolean;
  className?: string;
}

export function ZenithLogo({
  variant = 'gradient',
  size = 32,
  showText = true,
  className = '',
}: ZenithLogoProps) {
  const useGradient = variant === 'gradient' || variant === 'light';
  const iconColor = useGradient ? 'url(#zcaGrad)' : '#FFFFFF';
  const textColor = variant === 'dark' ? '#111827' : '#FFFFFF';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="zcaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B4EFF" />
            <stop offset="100%" stopColor="#FF4D00" />
          </linearGradient>
        </defs>
        {/* Z — 3 diagonal bars */}
        <rect x="4" y="5" width="24" height="5" rx="2.5" fill={iconColor} />
        <rect
          x="4"
          y="5"
          width="27"
          height="5"
          rx="2.5"
          fill={iconColor}
          transform="rotate(35 16 16)"
        />
        <rect x="4" y="22" width="24" height="5" rx="2.5" fill={iconColor} />
      </svg>
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className="font-bold tracking-[0.12em] text-sm"
            style={{ color: textColor }}
          >
            ZENITH
          </span>
          <span
            className="font-semibold tracking-[0.08em] text-[9px] opacity-70"
            style={{ color: textColor }}
          >
            COMPANY ADS
          </span>
        </div>
      )}
    </div>
  );
}

// Standalone Z icon for favicon / compact usage
export function ZenithIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="zcaGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6B4EFF" />
          <stop offset="100%" stopColor="#FF4D00" />
        </linearGradient>
      </defs>
      <rect x="4" y="5" width="24" height="5" rx="2.5" fill="url(#zcaGradIcon)" />
      <rect
        x="4"
        y="5"
        width="27"
        height="5"
        rx="2.5"
        fill="url(#zcaGradIcon)"
        transform="rotate(35 16 16)"
      />
      <rect x="4" y="22" width="24" height="5" rx="2.5" fill="url(#zcaGradIcon)" />
    </svg>
  );
}
