import { useState, type FormEvent } from "react";

import type { FleetDataSource } from "../../types/fleet";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

interface AssignMechanicModalProps {
  data: FleetDataSource;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mechanicProfileId: string) => Promise<void>;
}

export function AssignMechanicModal({
  data,
  isOpen,
  onClose,
  onSubmit,
}: AssignMechanicModalProps) {
  const [mechanicProfileId, setMechanicProfileId] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const mechanics = data.mechanicProfiles.flatMap((profile) => {
    const user = data.users.find((item) => item.id === profile.userId);
    return profile.status === "Active" && user?.status === "Active"
      ? [{ profile, user }]
      : [];
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mechanicProfileId) {
      setError("Select an active mechanic.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onSubmit(mechanicProfileId);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The work order could not be assigned.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      description="Assign an active mechanic before work begins."
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="assign-mechanic-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            Assign mechanic
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Assign work order"
    >
      <form
        className="management-form"
        id="assign-mechanic-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <FormField id="assigned-mechanic" label="Mechanic" required>
          <Select
            onChange={(event) => setMechanicProfileId(event.target.value)}
            value={mechanicProfileId}
          >
            <option value="">Select a mechanic</option>
            {mechanics.map(({ profile, user }) => (
              <option key={profile.id} value={profile.id}>
                {user.fullName} · {profile.specialty}
              </option>
            ))}
          </Select>
        </FormField>
        {error && (
          <p className="form-banner form-banner-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
