interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BabyFlow logo"
    >
      {/* Soft circular background */}
      <circle cx="20" cy="20" r="20" fill="#F0ABFC" />

      {/* Baby footprint — left foot */}
      <ellipse cx="13" cy="24" rx="4" ry="5.5" fill="white" fillOpacity="0.9" />
      <circle cx="11" cy="18.5" r="1.4" fill="white" fillOpacity="0.9" />
      <circle cx="13.5" cy="17.5" r="1.3" fill="white" fillOpacity="0.9" />
      <circle cx="16" cy="18.2" r="1.2" fill="white" fillOpacity="0.9" />
      <circle cx="17.5" cy="19.8" r="1.1" fill="white" fillOpacity="0.9" />

      {/* Baby footprint — right foot */}
      <ellipse cx="27" cy="24" rx="4" ry="5.5" fill="white" fillOpacity="0.7" transform="rotate(-8 27 24)" />
      <circle cx="24.5" cy="18.5" r="1.2" fill="white" fillOpacity="0.7" />
      <circle cx="27" cy="17.5" r="1.3" fill="white" fillOpacity="0.7" />
      <circle cx="29.5" cy="18.2" r="1.2" fill="white" fillOpacity="0.7" />
      <circle cx="31" cy="19.8" r="1.1" fill="white" fillOpacity="0.7" />

      {/* Small moon — sleep indicator */}
      <path
        d="M20 7 C17 7 15 9.5 15 12 C15 14.5 17 17 20 17 C18 16 17 14 17 12 C17 10 18 8 20 7Z"
        fill="white"
        fillOpacity="0.85"
      />
    </svg>
  );
}

export function LogoWithText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Logo size={36} />
      <span className="text-xl font-bold text-purple-700 tracking-tight">
        Baby<span className="text-fuchsia-500">Flow</span>
      </span>
    </div>
  );
}
