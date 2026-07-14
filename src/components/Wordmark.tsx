/**
 * LOOV wordmark as TEXT in Cinzel Decorative (the logo's own typeface,
 * loaded via next/font in layout.tsx as --font-display). Text instead of a
 * raster: crisp at every size and follows the theme color automatically.
 */
export default function Wordmark({ className = "text-xl text-ink" }: { className?: string }) {
  return (
    <span
      className={`font-display font-bold leading-none tracking-[0.06em] select-none ${className}`}
    >
      LOOV
    </span>
  );
}
