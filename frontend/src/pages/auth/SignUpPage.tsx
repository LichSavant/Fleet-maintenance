import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
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
  specialization?: string;
}

const initialForm = {
  confirmPassword: "",
  email: "",
  fullName: "",
  licenseNumber: "",
  password: "",
  role: "" as UserRole | "",
  specialization: "",
};

export default function SignUpPage() {
  const { signUp } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: SignUpErrors = {};

    if (!isRequired(form.fullName))
      nextErrors.fullName = "Full name is required.";
    if (!isValidEmail(form.email))
      nextErrors.email = "Enter a valid email address.";
    if (!isValidPassword(form.password)) {
      nextErrors.password =
        "Use at least eight characters with letters and numbers.";
    }
    if (!isRequired(form.confirmPassword)) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!form.role) nextErrors.role = "Select an operational role.";
    if (form.role === "driver" && !isRequired(form.licenseNumber)) {
      nextErrors.licenseNumber = "Driver license number is required.";
    }
    if (form.role === "mechanic" && !isRequired(form.specialization)) {
      nextErrors.specialization = "Mechanic specialization is required.";
    }

    setErrors(nextErrors);
    setFormError("");
    setSuccess("");
    if (Object.keys(nextErrors).length > 0 || !form.role) return;

    setIsSubmitting(true);
    try {
      const user = await signUp({ ...form, role: form.role });
      setSuccess(
        `${user.fullName}, your ${user.role} demonstration account is ready. You can now sign in.`,
      );
      setForm(initialForm);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "ForgeFleet could not create the demonstration account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-form-card auth-form-card-wide">
      <p className="eyebrow">Frontend registration</p>
      <h2>Create a ForgeFleet account</h2>
      <p className="auth-intro">
        Self-service registration is available for Driver and Mechanic demo
        accounts. Privileged roles require a future provisioned workflow.
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
              type="email"
              value={form.email}
            />
          </FormField>
          <FormField
            error={errors.password}
            hint="At least eight characters, including a letter and number."
            id="sign-up-password"
            label="Password"
            required
          >
            <Input
              autoComplete="new-password"
              onChange={(event) => updateField("password", event.target.value)}
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
              type="password"
              value={form.confirmPassword}
            />
          </FormField>
        </div>

        <FormField
          error={errors.role}
          hint="Admin and Manager cannot be self-registered in this frontend prototype."
          id="sign-up-role"
          label="Operational role"
          required
        >
          <Select
            onChange={(event) => updateField("role", event.target.value)}
            value={form.role}
          >
            <option value="">Select a role</option>
            <option value="driver">Driver</option>
            <option value="mechanic">Mechanic</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrator</option>
          </Select>
        </FormField>

        {form.role === "driver" && (
          <FormField
            error={errors.licenseNumber}
            id="sign-up-license"
            label="Driver license number"
            required
          >
            <Input
              autoComplete="off"
              onChange={(event) =>
                updateField("licenseNumber", event.target.value)
              }
              value={form.licenseNumber}
            />
          </FormField>
        )}

        {form.role === "mechanic" && (
          <FormField
            error={errors.specialization}
            id="sign-up-specialization"
            label="Mechanic specialization"
            required
          >
            <Input
              autoComplete="organization-title"
              onChange={(event) =>
                updateField("specialization", event.target.value)
              }
              value={form.specialization}
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
          {isSubmitting ? "Creating account" : "Create account"}
        </Button>
      </form>

      <p className="auth-switch">
        Already registered? <Link to="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
