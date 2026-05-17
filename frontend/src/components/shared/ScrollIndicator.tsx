interface ScrollIndicatorProps {
  className?: string;
  text?: string;
}

export default function ScrollIndicator({ 
  className = "", 
  text = "Deslize a tela" 
}: ScrollIndicatorProps) {
  return (
    <div className={`w-full flex flex-col items-center gap-1 mt-auto pt-6 ${className} align-center justify-center`}>
      <span className="subtitle text-[10px] uppercase tracking-[0.3em] text-black select-none">
        {text}
      </span>
      <svg
        className="w-4 h-4 text-black/40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path className="animate-pulse"strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}