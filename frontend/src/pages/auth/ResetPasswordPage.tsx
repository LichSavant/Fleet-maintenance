import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { isValidPassword } from "../../utils/validation";

export default function ResetPasswordPage() {
  const { signOut, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isValidPassword(password)) {
      setError("Use at least eight characters with letters and numbers.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(
        "Your password has been changed. Sign in with the new password.",
      );
      signOut();
      setPassword("");
      setConfirmPassword("");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The password could not be changed. Open a fresh recovery link and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-form-card glass-panel">
      <p className="auth-form-kicker">Secure recovery</p>
      <h2>Choose a new password</h2>
      <p className="auth-intro">
        This form uses the secure recovery session from the link sent to your
        email.
      </p>
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <FormField id="reset-password" label="New password" required>
          <Input
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a new password"
            type="password"
            value={password}
          />
        </FormField>
        <FormField
          id="reset-confirm-password"
          label="Confirm new password"
          required
        >
          <Input
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm your new password"
            type="password"
            value={confirmPassword}
          />
        </FormField>
        {error && (
          <p className="form-banner form-banner-error" role="alert">
            {error}
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
          Update password
        </Button>
      </form>
    </div>
  );
}
