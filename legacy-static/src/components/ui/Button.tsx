import type { ButtonHTMLAttributes, ReactNode } from "react";

import { classNames } from "../../utils/classNames";
import { LoadingSpinner } from "../common/LoadingSpinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  isLoading = false,
  leadingIcon,
  size = "medium",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        "button",
        `button-${variant}`,
        `button-${size}`,
        fullWidth && "button-full-width",
        className,
      )}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner label="Working" size="small" />
      ) : (
        leadingIcon
      )}
      <span>{children}</span>
    </button>
  );
}
