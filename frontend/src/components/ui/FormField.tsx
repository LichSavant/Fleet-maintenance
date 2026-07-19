import { cloneElement, type ReactElement, type ReactNode } from "react";

interface FieldControlProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  id?: string;
  required?: boolean;
}

export interface FormFieldProps {
  children: ReactElement<FieldControlProps>;
  error?: string;
  hint?: ReactNode;
  id: string;
  label: ReactNode;
  required?: boolean;
}

export function FormField({
  children,
  error,
  hint,
  id,
  label,
  required = false,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {cloneElement(children, {
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        id,
        required,
      })}
      {hint && (
        <p className="form-hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="form-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
