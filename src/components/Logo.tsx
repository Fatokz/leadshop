export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#f25c1f" />
      <path d="M11 9v14h10" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22" cy="10.5" r="2.2" fill="#ffd166" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Logo />
      <span className="text-[17px] font-semibold tracking-tight text-ink">
        Lead<span className="text-brand-600">Shop</span>
      </span>
    </span>
  );
}
