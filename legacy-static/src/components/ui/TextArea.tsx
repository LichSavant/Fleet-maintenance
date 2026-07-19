import { forwardRef, type TextareaHTMLAttributes } from "react";

import { classNames } from "../../utils/classNames";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      className={classNames("form-control", "textarea-control", className)}
      ref={ref}
      rows={rows}
      {...props}
    />
  ),
);

TextArea.displayName = "TextArea";
