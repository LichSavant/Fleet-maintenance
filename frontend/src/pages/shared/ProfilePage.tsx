import { type FormEvent, useState } from "react";

import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { sharedViewService } from "../../services/sharedViewService";
import { formatRole } from "../../utils/roleRoutes";
import { getStatusTone } from "../../utils/statusTone";
import { isValidEmail, isValidPassword } from "../../utils/validation";

export default function ProfilePage() {
  const { updatePassword, updateProfile, user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  if (isLoading) return <ManagementLoadingState label="Loading profile" />;
  if (error)
    return (
      <ErrorState
        description={error}
        onRetry={reload}
        title="Profile could not be loaded"
      />
    );
  if (!data || !user) return null;

  const profile = sharedViewService.getProfile(data, user.id);
  if (!profile) {
    return (
      <ErrorState
        description="The active session is not linked to a fleet user record."
        title="Profile is unavailable"
      />
    );
  }

  const nameError = fullName.trim().length < 2 ? "Enter your full name." : "";
  const emailError = isValidEmail(email) ? "" : "Enter a valid email address.";

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (nameError || emailError) return;
    setFeedback(null);
    setIsSaving(true);
    try {
      await updateProfile({ email, fullName });
      setFeedback({
        message:
          "Profile details updated for the current session and fleet record.",
        tone: "success",
      });
    } catch (saveError) {
      setFeedback({
        message:
          saveError instanceof Error
            ? saveError.message
            : "Your profile could not be updated.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordFeedback(null);
    if (!isValidPassword(newPassword)) {
      setPasswordFeedback({
        message: "Use at least eight characters with letters and numbers.",
        tone: "error",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        message: "Passwords do not match.",
        tone: "error",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      await updatePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        message: "Password changed successfully.",
        tone: "success",
      });
    } catch (passwordError) {
      setPasswordFeedback({
        message:
          passwordError instanceof Error
            ? passwordError.message
            : "Your password could not be changed.",
        tone: "error",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Workspace" }, { label: "Profile" }]}
        eyebrow="Current account"
        subtitle="Review your fleet account and update non-sensitive contact details."
        title="Profile"
      />
      {feedback && (
        <p
          className={`management-feedback management-feedback-${feedback.tone}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
      <div className="profile-layout">
        <Card eyebrow="Account details" title="Signed-in user">
          <dl className="profile-summary">
            <div>
              <dt>Role</dt>
              <dd>{formatRole(profile.user.role)}</dd>
            </div>
            <div>
              <dt>Account status</dt>
              <dd>
                <StatusBadge tone={getStatusTone(profile.user.status)}>
                  {profile.user.status}
                </StatusBadge>
              </dd>
            </div>
            <div>
              <dt>Role detail</dt>
              <dd>{profile.roleDetail}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd>{profile.user.id}</dd>
            </div>
          </dl>
        </Card>
        <Card eyebrow="Editable fields" title="Contact information">
          <form className="profile-form" onSubmit={saveProfile}>
            <FormField
              error={fullName && nameError ? nameError : undefined}
              id="profile-full-name"
              label="Full name"
              required
            >
              <Input
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
                value={fullName}
              />
            </FormField>
            <FormField
              error={email && emailError ? emailError : undefined}
              id="profile-email"
              label="Email address"
              required
            >
              <Input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </FormField>
            <Button
              disabled={Boolean(nameError || emailError)}
              isLoading={isSaving}
              type="submit"
            >
              Save profile
            </Button>
          </form>
        </Card>
      </div>
      <Card eyebrow="Account security" title="Change password">
        <form className="profile-form" onSubmit={changePassword}>
          <FormField id="profile-new-password" label="New password" required>
            <Input
              autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </FormField>
          <FormField
            id="profile-confirm-password"
            label="Confirm new password"
            required
          >
            <Input
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
          </FormField>
          {passwordFeedback && (
            <p
              className={`management-feedback management-feedback-${passwordFeedback.tone}`}
              role={passwordFeedback.tone === "error" ? "alert" : "status"}
            >
              {passwordFeedback.message}
            </p>
          )}
          <Button isLoading={isChangingPassword} type="submit">
            Change password
          </Button>
        </form>
      </Card>
    </div>
  );
}
