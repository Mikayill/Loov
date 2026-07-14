export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/* Nordic buttons: rectangular, uppercase micro-tracking, solid ink primary */
const base =
  "inline-flex items-center justify-center gap-2 font-semibold uppercase tracking-[0.08em] rounded-control transition-colors duration-200 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "text-white bg-ink hover:bg-accent",
  secondary: "border border-ink text-ink hover:bg-ink hover:text-white",
  ghost: "text-ink-soft hover:text-ink hover:bg-panel",
  danger: "text-white bg-danger hover:opacity-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[11px]",
  md: "h-11 px-6 text-[12px]",
  lg: "h-12 px-7 text-[13px]",
};

export function buttonClasses(opts: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  const { variant = "primary", size = "md", fullWidth = false, className = "" } = opts;
  return [base, variantClasses[variant], sizeClasses[size], fullWidth && "w-full", className]
    .filter(Boolean)
    .join(" ");
}

export function buttonStyle(_variant: ButtonVariant = "primary") {
  // Colors now come from the semantic token classes above; kept for API compatibility.
  return undefined;
}
