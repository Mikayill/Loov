export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-extrabold rounded-xl transition-all duration-200 ease-snappy active:scale-95 disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "text-white hover:opacity-90 shadow-sm",
  secondary: "border-2 border-[#DDD5CC] text-[#5E5450] hover:border-[#5E9E8C] hover:text-[#5E9E8C]",
  ghost: "text-[#5E5450] hover:text-[#2A2320] hover:bg-[#F5F0EB]",
  danger: "text-white bg-red-500 hover:bg-red-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
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

export function buttonStyle(variant: ButtonVariant = "primary") {
  return variant === "primary" ? { backgroundColor: "#5E9E8C" } : undefined;
}
