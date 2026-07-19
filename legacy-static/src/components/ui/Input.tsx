import { forwardRef, type InputHTMLAttributes } from "react";

import { classNames } from "../../utils/classNames";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      className={classNames("form-control", className)}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

Input.displayName = "Input";
