import { useState, type FormEvent } from "react";

import type { VehicleStatus } from "../../types/fleet";
import { ManagementError, type VehicleInput } from "../../types/management";
import { isRequired } from "../../utils/validation";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

export interface VehicleFormValues extends VehicleInput {
  id?: string;
}

export interface VehicleFormModalProps {
  initialValues?: VehicleFormValues | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: VehicleInput) => Promise<void>;
}

type VehicleFormErrors = Partial<Record<keyof VehicleInput, string>>;

const EMPTY_VEHICLE: VehicleInput = {
  fleetNumber: "",
  manufacturer: "",
  mileage: 0,
  model: "",
  plate: "",
  status: "Active",
  type: "",
  year: new Date().getFullYear(),
};

export function VehicleFormModal({
  initialValues,
  isOpen,
  onClose,
  onSubmit,
}: VehicleFormModalProps) {
  const [values, setValues] = useState<VehicleInput>(() => ({
    ...EMPTY_VEHICLE,
    ...initialValues,
  }));
  const [errors, setErrors] = useState<VehicleFormErrors>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(initialValues?.id);

  const update = <K extends keyof VehicleInput>(
    field: K,
    value: VehicleInput[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: VehicleFormErrors = {};
    for (const field of [
      "fleetNumber",
      "plate",
      "manufacturer",
      "model",
      "type",
    ] as const) {
      if (!isRequired(values[field]))
        nextErrors[field] = "This field is required.";
    }
    if (values.year < 1980 || values.year > new Date().getFullYear() + 1) {
      nextErrors.year = "Enter a year between 1980 and next year.";
    }
    if (values.mileage < 0) nextErrors.mileage = "Mileage cannot be negative.";
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(
        error instanceof ManagementError
          ? error.message
          : "ForgeFleet could not save this vehicle.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      description="Maintain the vehicle identity and operational record. Assignments remain in the assignments workflow."
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="vehicle-management-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            {isEditing ? "Save changes" : "Add vehicle"}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={isEditing ? "Edit vehicle" : "Add vehicle"}
    >
      <form
        className="management-form"
        id="vehicle-management-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="form-grid form-grid-two">
          <FormField
            error={errors.fleetNumber}
            id="vehicle-fleet-number"
            label="Fleet number"
            required
          >
            <Input
              onChange={(event) => update("fleetNumber", event.target.value)}
              value={values.fleetNumber}
            />
          </FormField>
          <FormField
            error={errors.plate}
            id="vehicle-plate"
            label="Plate number"
            required
          >
            <Input
              onChange={(event) => update("plate", event.target.value)}
              value={values.plate}
            />
          </FormField>
          <FormField
            error={errors.manufacturer}
            id="vehicle-make"
            label="Make"
            required
          >
            <Input
              onChange={(event) => update("manufacturer", event.target.value)}
              value={values.manufacturer}
            />
          </FormField>
          <FormField
            error={errors.model}
            id="vehicle-model"
            label="Model"
            required
          >
            <Input
              onChange={(event) => update("model", event.target.value)}
              value={values.model}
            />
          </FormField>
          <FormField
            error={errors.year}
            id="vehicle-year"
            label="Year"
            required
          >
            <Input
              onChange={(event) => update("year", Number(event.target.value))}
              type="number"
              value={values.year}
            />
          </FormField>
          <FormField
            error={errors.type}
            id="vehicle-type"
            label="Vehicle type"
            required
          >
            <Input
              onChange={(event) => update("type", event.target.value)}
              value={values.type}
            />
          </FormField>
          <FormField id="vehicle-status" label="Status" required>
            <Select
              onChange={(event) =>
                update("status", event.target.value as VehicleStatus)
              }
              value={values.status}
            >
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inspection">Inspection</option>
              <option value="Out of Service">Out of service</option>
            </Select>
          </FormField>
          <FormField
            error={errors.mileage}
            id="vehicle-mileage"
            label="Mileage"
            required
          >
            <Input
              min="0"
              onChange={(event) =>
                update("mileage", Number(event.target.value))
              }
              type="number"
              value={values.mileage}
            />
          </FormField>
        </div>
        {formError && (
          <p className="form-banner form-banner-error" role="alert">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
