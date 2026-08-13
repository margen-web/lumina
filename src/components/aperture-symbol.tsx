"use client";

interface ApertureSymbolProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export function ApertureSymbol({ className = "", size = 20, glow = false }: ApertureSymbolProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          className="absolute inset-0 rounded-full bg-sky-400/40 dark:bg-sky-400/30 blur-md animate-pulse"
          aria-hidden="true"
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-300"
      >
        {/* Círculo exterior suave */}
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
        
        {/* Núcleo de luz geométrico (Apertura) */}
        <path
          d="M12 4.5V9.5M12 14.5V19.5M4.5 12H9.5M14.5 12H19.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    </div>
  );
}
