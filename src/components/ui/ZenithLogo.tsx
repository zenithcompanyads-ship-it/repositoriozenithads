'use client';

interface ZenithLogoProps {
  variant?: 'light' | 'dark' | 'gradient';
  size?: number;
  showText?: boolean;
  className?: string;
}

export function ZenithLogo({
  variant = 'light',
  size = 32,
  showText = true,
  className = '',
}: ZenithLogoProps) {
  const iconColor =
    variant === 'gradient'
      ? 'url(#zenithGradient)'
      : variant === 'light'
      ? '#4040E8'
      : '#FFFFFF';

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
          <linearGradient
            id="zenithGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#6B4EFF" />
            <stop offset="100%" stopColor="#FF4D00" />
          </linearGradient>
        </defs>
        {/* Z — 3 diagonal bars */}
        {/* Top bar */}
        <rect
          x="4"
          y="5"
          width="24"
          height="5"
          rx="2.5"
          fill={iconColor}
        />
        {/* Diagonal bar */}
        <rect
          x="4"
          y="5"
          width="27"
          height="5"
          rx="2.5"
          fill={iconColor}
          transform="rotate(35 16 16)"
        />
        {/* Bottom bar */}
        <rect
          x="4"
          y="22"
          width="24"
          height="5"
          rx="2.5"
          fill={iconColor}
        />
      </svg>
      {showText && (
        <span
          className="font-bold tracking-[0.15em] text-lg"
          style={{ color: textColor }}
        >
          ZENITH
        </span>
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
      <rect x="4" y="5" width="24" height="5" rx="2.5" fill="#4040E8" />
      <rect
        x="4"
        y="5"
        width="27"
        height="5"
        rx="2.5"
        fill="#4040E8"
        transform="rotate(35 16 16)"
      />
      <rect x="4" y="22" width="24" height="5" rx="2.5" fill="#4040E8" />
    </svg>
  );
}
