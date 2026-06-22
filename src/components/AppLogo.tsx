interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 28, text: "text-base" },
  md: { icon: 32, text: "text-lg" },
  lg: { icon: 40, text: "text-xl" },
};

export default function AppLogo({ size = "md", showWordmark = true, className = "" }: AppLogoProps) {
  const { icon, text } = SIZES[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="flex shrink-0 items-center justify-center rounded-[10px] bg-cream font-serif font-bold text-accent"
        style={{ width: icon, height: icon, fontSize: Math.round(icon * 0.55) }}
        aria-hidden
      >
        R
      </div>
      {showWordmark && (
        <span className={`font-serif font-bold tracking-tight text-ink ${text}`}>速读</span>
      )}
    </div>
  );
}
