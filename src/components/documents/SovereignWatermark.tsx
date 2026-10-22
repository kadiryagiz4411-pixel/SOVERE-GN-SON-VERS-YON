export function SovereignWatermark({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 120 140"
        className="absolute bottom-4 right-4 h-36 w-32 opacity-[0.06] sm:h-44 sm:w-40"
        fill="none"
      >
        <path
          d="M86 28c-8-12-22-18-38-16-18 3-32 16-34 34-2 16 8 28 24 34 14 5 24 10 26 20 2 12-8 20-24 22-14 2-28-4-36-14"
          stroke="#F59E0B"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M34 112c8 12 22 18 38 16 18-3 32-16 34-34 2-16-8-28-24-34-14-5-24-10-26-20-2-12 8-20 24-22 14-2 28 4 36 14"
          stroke="#F59E0B"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
