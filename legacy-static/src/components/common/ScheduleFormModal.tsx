import { useState, type FormEvent } from "react";

import type { FleetDataSource } from "../../types/fleet";
import type { MaintenanceScheduleInput } from "../../types/operations";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { TextArea } from "../ui/TextArea";

interface ScheduleFormModalProps {
  data: FleetDataSource;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: MaintenanceScheduleInput) => Promise<void>;
}

const EMPTY_SCHEDULE: MaintenanceScheduleInput = {
  dueDate: "",
  notes: "",
  serviceTypeId: "",
  vehicleId: "",
};

export function ScheduleFormModal({
  data,
  isOpen,
  onClose,
  onSubmit,
}: ScheduleFormModalProps) {
  const [values, setValues] = useState(EMPTY_SCHEDULE);
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
    setError("");
    if (!values.vehicleId || !values.serviceTypeId || !values.dueDate) {
      setError("Select a vehicle, service type, and scheduled date.");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ForgeFleet could not create this schedule.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      description="Create a maintenance plan without duplicating a work order. It can be converted once when execution is ready."
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="schedule-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            Create schedule
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Schedule maintenance"
    >
      <form
        className="management-form"
        id="schedule-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="form-grid">
          <FormField id="schedule-vehicle" label="Vehicle" required>
            <Select
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  vehicleId: event.target.value,
                }))
              }
              value={values.vehicleId}
            >
              <option value="">Select a vehicle</option>
              {data.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.fleetNumber} · {vehicle.model}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="schedule-service" label="Service type" required>
            <Select
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  serviceTypeId: event.target.value,
                }))
              }
              value={values.serviceTypeId}
            >
              <option value="">Select a service</option>
              {data.serviceTypes
                .filter((serviceType) => serviceType.active)
                .map((serviceType) => (
                  <option key={serviceType.id} value={serviceType.id}>
                    {serviceType.name}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField id="schedule-date" label="Scheduled date" required>
            <Input
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
              type="date"
              value={values.dueDate}
            />
          </FormField>
          <FormField id="schedule-mechanic" label="Preferred mechanic">
            <Select
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  mechanicProfileId: event.target.value || undefined,
                }))
              }
              value={values.mechanicProfileId ?? ""}
            >
              <option value="">Assign later</option>
              {mechanics.map(({ profile, user }) => (
                <option key={profile.id} value={profile.id}>
                  {user.fullName} · {profile.specialty}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField id="schedule-notes" label="Planning notes">
          <TextArea
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
            value={values.notes}
          />
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
