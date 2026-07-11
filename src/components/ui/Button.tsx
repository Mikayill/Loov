"use client";

import Spinner from "./Spinner";
import { buttonClasses, buttonStyle, ButtonVariant, ButtonSize } from "./buttonStyles";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  loadingText,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, fullWidth, className })}
      style={buttonStyle(variant)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
