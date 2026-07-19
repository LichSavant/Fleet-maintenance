import type { ChangeEvent, InputHTMLAttributes } from "react";

import { classNames } from "../../utils/classNames";
import { Icon } from "./Icon";

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type"
> {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export function SearchInput({
  className,
  label,
  onChange,
  value,
  ...props
}: SearchInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={classNames("search-input", className)}>
      <Icon name="search" />
      <label className="sr-only" htmlFor={props.id}>
        {label}
      </label>
      <input
        {...props}
        className="form-control"
        onChange={handleChange}
        type="search"
        value={value}
      />
      {value && (
        <button
          aria-label={`Clear ${label.toLowerCase()}`}
          className="search-clear"
          onClick={() => onChange("")}
          type="button"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}
