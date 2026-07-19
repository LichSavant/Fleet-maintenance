import { forwardRef, type SelectHTMLAttributes } from "react";

import { classNames } from "../../utils/classNames";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, className, ...props }, ref) => (
    <select
      className={classNames("form-control", "select-control", className)}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = "Select";
