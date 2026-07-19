import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { AuthError } from "../../types/auth";
import { getRoleDashboardPath } from "../../utils/roleRoutes";
import { isRequired, isValidEmail } from "../../utils/validation";

interface SignInErrors {
  email?: string;
  password?: string;
}

export default function SignInPage() {
  const { rememberedEmail, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(Boolean(rememberedEmail));
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: SignInErrors = {};
    if (!isValidEmail(email)) nextErrors.email = "Enter a valid email address.";
    if (!isRequired(password)) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) return;
    setIsSubmitting(true);
    try {
      const session = await signIn({ email, password, rememberEmail });
      navigate(getRoleDashboardPath(session.user.role), { replace: true });
    } catch (error) {
      setFormError(
        error instanceof AuthError
          ? error.message
          : "ForgeFleet could not sign you in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-form-card glass-panel">
      <p className="auth-form-kicker">Sign in</p>
      <h2>Access your ForgeFleet account</h2>
      <p className="auth-intro">
        Your verified role opens the correct operational workspace.
      </p>
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <FormField
          error={errors.email}
          id="sign-in-email"
          label="Email address"
          required
        >
          <Input
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </FormField>
        <div className="password-field">
          <FormField
            error={errors.password}
            id="sign-in-password"
            label="Password"
            required
          >
            <Input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              value={password}
            />
          </FormField>
          <button
            aria-pressed={showPassword}
            className="password-toggle"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div className="auth-form-options">
          <label className="checkbox-label">
            <input
              checked={rememberEmail}
              onChange={(event) => setRememberEmail(event.target.checked)}
              type="checkbox"
            />
            Remember me
          </label>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        {formError && (
          <p className="form-banner form-banner-error" role="alert">
            {formError}
          </p>
        )}
        <Button
          fullWidth
          isLoading={isSubmitting}
          type="submit"
          variant="primary"
        >
          Sign in
        </Button>
      </form>
      <p className="auth-role-note">
        Access for Administrator, Manager, Mechanic, and Driver accounts.
      </p>
      <p className="auth-switch">
        New to ForgeFleet? <Link to="/sign-up">Create an account</Link>
      </p>
    </div>
  );
}
