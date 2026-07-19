import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { isValidEmail } from "../../utils/validation";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSuccess(
        "Password recovery instructions have been requested. Check your inbox.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The recovery request could not be sent.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="auth-form-card glass-panel">
      <p className="auth-form-kicker">Account recovery</p>
      <h2>Reset your password</h2>
      <p className="auth-intro">
        Enter the email connected to your ForgeFleet account.
      </p>
      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <FormField
          error={error}
          id="recovery-email"
          label="Email address"
          required
        >
          <Input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </FormField>
        {success && (
          <p className="form-banner form-banner-success" role="status">
            {success}
          </p>
        )}
        <Button
          fullWidth
          isLoading={isSubmitting}
          type="submit"
          variant="primary"
        >
          Send recovery link
        </Button>
      </form>
      <p className="auth-switch">
        <Link to="/sign-in">Return to sign in</Link>
      </p>
    </div>
  );
}
