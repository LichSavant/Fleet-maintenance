export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function isRequired(value: string) {
  return value.trim().length > 0;
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPassword(value: string) {
  return PASSWORD_PATTERN.test(value);
}
