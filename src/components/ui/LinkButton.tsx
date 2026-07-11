"use client";

import Link, { LinkProps } from "next/link";
import { buttonClasses, buttonStyle, ButtonVariant, ButtonSize } from "./buttonStyles";

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
}

export default function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} style={buttonStyle(variant)} {...rest}>
      {children}
    </Link>
  );
}
