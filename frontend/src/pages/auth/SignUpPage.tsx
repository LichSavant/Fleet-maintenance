import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types/auth";
import {
  isRequired,
  isValidEmail,
  isValidPassword,
} from "../../utils/validation";

interface SignUpErrors {
  confirmPassword?: string;
  email?: string;
  fullName?: string;
  licenseNumber?: string;
  password?: string;
  role?: string;
  specialty?: string;
}
const initialForm = {
  confirmPassword: "",
  email: "",
  fullName: "",
  licenseNumber: "",
  password: "",
  role: "driver" as UserRole,
  specialty: "",
};
const roles: Array<{
  label: string;
  role: UserRole;
  detail: string;
  selfService: boolean;
}> = [
  { label: "Admin", role: "admin", detail: "Invite only", selfService: false },
  {
    label: "Manager",
    role: "manager",
    detail: "Invite only",
    selfService: false,
  },
  {
    label: "Mechanic",
    role: "mechanic",
    detail: "Self-service",
    selfService: true,
  },
  {
    label: "Driver",
    role: "driver",
    detail: "Self-service",
    selfService: true,
  },
];

export default function SignUpPage() {
  const { signUp } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: SignUpErrors = {};
    if (!isRequired(form.fullName))
      nextErrors.fullName = "Full name is required.";
    if (!isValidEmail(form.email))
      nextErrors.email = "Enter a valid email address.";
    if (!isValidPassword(form.password))
      nextErrors.password =
        "Use at least eight characters with letters and numbers.";
    if (form.password !== form.confirmPassword)
      nextErrors.confirmPassword = "Passwords do not match.";
    if (!["driver", "mechanic"].includes(form.role))
      nextErrors.role = "Administrator and Manager accounts are invite-only.";
    if (form.role === "driver" && !isRequired(form.licenseNumber))
      nextErrors.licenseNumber = "Driver license number is required.";
    if (form.role === "mechanic" && !isRequired(form.specialty))
      nextErrors.specialty = "Mechanic specialty is required.";
    setErrors(nextErrors);
    setFormError("");
    setSuccess("");
    if (Object.keys(nextErrors).length) return;
    setIsSubmitting(true);
    try {
      const user = await signUp(form);
      setSuccess(
        `Account created for ${user.fullName}. Check your email if confirmation is enabled, then sign in.`,
      );
      setForm(initialForm);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "ForgeFleet could not create the account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-form-card auth-form-card-wide glass-panel">
      <p className="auth-form-kicker">Sign up</p>
      <h2>Create your ForgeFleet account</h2>
      <p className="auth-intro">
        Driver and Mechanic accounts can register directly. Privileged roles
        require an invitation.
      </p>
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <div className="auth-form-grid">
          <FormField
            error={errors.fullName}
            id="sign-up-name"
            label="Full name"
            required
          >
            <Input
              autoComplete="name"
              onChange={(event) => updateField("fullName", event.target.value)}
              placeholder="John Doe"
              value={form.fullName}
            />
          </FormField>
          <FormField
            error={errors.email}
            id="sign-up-email"
            label="Email address"
            required
          >
            <Input
              autoComplete="email"
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={form.email}
            />
          </FormField>
          <FormField
            error={errors.password}
            id="sign-up-password"
            label="Password"
            required
          >
            <Input
              autoComplete="new-password"
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Create a password"
              type="password"
              value={form.password}
            />
          </FormField>
          <FormField
            error={errors.confirmPassword}
            id="sign-up-confirm-password"
            label="Confirm password"
            required
          >
            <Input
              autoComplete="new-password"
              onChange={(event) =>
                updateField("confirmPassword", event.target.value)
              }
              placeholder="Confirm your password"
              type="password"
              value={form.confirmPassword}
            />
          </FormField>
        </div>
        <fieldset className="role-selector">
          <legend>I am signing up as</legend>
          <div>
            {roles.map((item) => (
              <button
                className={
                  form.role === item.role
                    ? "role-option role-option-active"
                    : "role-option"
                }
                disabled={!item.selfService}
                key={item.role}
                onClick={() => updateField("role", item.role)}
                type="button"
              >
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </button>
            ))}
          </div>
          {errors.role && <p className="field-error">{errors.role}</p>}
        </fieldset>
        {form.role === "driver" && (
          <FormField
            error={errors.licenseNumber}
            id="sign-up-license"
            label="Driver license number"
            required
          >
            <Input
              onChange={(event) =>
                updateField("licenseNumber", event.target.value)
              }
              value={form.licenseNumber}
            />
          </FormField>
        )}
        {form.role === "mechanic" && (
          <FormField
            error={errors.specialty}
            id="sign-up-specialty"
            label="Mechanic specialty"
            required
          >
            <Input
              onChange={(event) => updateField("specialty", event.target.value)}
              value={form.specialty}
            />
          </FormField>
        )}
        {formError && (
          <p className="form-banner form-banner-error" role="alert">
            {formError}
          </p>
        )}
        {success && (
          <p className="form-banner form-banner-success" role="status">
            {success} <Link to="/sign-in">Continue to sign in</Link>
          </p>
        )}
        <Button
          fullWidth
          isLoading={isSubmitting}
          type="submit"
          variant="primary"
        >
          Create account
        </Button>
      </form>
      <p className="auth-switch">
        Already registered? <Link to="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
