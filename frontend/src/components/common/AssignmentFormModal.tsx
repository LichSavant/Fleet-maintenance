import { useState, type FormEvent } from "react";

import type { FleetState } from "../../types/fleet";
import type { AssignmentInput } from "../../types/operations";
import { operationsViewService } from "../../services/operationsViewService";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

interface AssignmentFormModalProps {
  data: FleetState;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: AssignmentInput) => Promise<void>;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function AssignmentFormModal({
  data,
  isOpen,
  onClose,
  onSubmit,
}: AssignmentFormModalProps) {
  const [values, setValues] = useState<AssignmentInput>({
    driverId: "",
    startDate: getToday(),
    vehicleId: "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const drivers = operationsViewService.getEligibleDrivers(data);
  const vehicles = operationsViewService.getEligibleVehicles(data);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!values.driverId || !values.vehicleId || !values.startDate) {
      setError("Select a driver, vehicle, and assignment start date.");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ForgeFleet could not create this assignment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      description="Only active, available drivers and vehicles appear in these lists."
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="assignment-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            Create assignment
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Create vehicle assignment"
    >
      <form
        className="management-form"
        id="assignment-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <FormField id="assignment-driver" label="Eligible driver" required>
          <Select
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                driverId: event.target.value,
              }))
            }
            value={values.driverId}
          >
            <option value="">Select a driver</option>
            {drivers.map(({ profile, user }) => (
              <option key={profile.id} value={profile.id}>
                {user.fullName} · {profile.licenseNumber}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="assignment-vehicle" label="Available vehicle" required>
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
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.fleetNumber} · {vehicle.model}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id="assignment-start" label="Start date" required>
          <Input
            max={getToday()}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
            type="date"
            value={values.startDate}
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
