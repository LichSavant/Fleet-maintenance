import { useState, type FormEvent } from "react";

import type { MaintenanceHistoryRecord } from "../../types/fleet";
import type { MaintenanceHistoryCorrectionInput } from "../../types/operations";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { TextArea } from "../ui/TextArea";

interface HistoryCorrectionModalProps {
  history: MaintenanceHistoryRecord;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: MaintenanceHistoryCorrectionInput) => Promise<void>;
}

export function HistoryCorrectionModal({
  history,
  isOpen,
  onClose,
  onSubmit,
}: HistoryCorrectionModalProps) {
  const [values, setValues] = useState<MaintenanceHistoryCorrectionInput>({
    notes: history.notes,
    odometerAtService: history.odometerAtService,
    serviceDate: history.serviceDate,
    totalCost: history.totalCost,
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (
      !values.notes.trim() ||
      !values.serviceDate ||
      !Number.isInteger(values.odometerAtService) ||
      values.odometerAtService < 0 ||
      !Number.isFinite(values.totalCost) ||
      values.totalCost < 0
    ) {
      setError("Enter a valid date, mileage, cost, and correction notes.");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ForgeFleet could not save this correction.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      description="Only service facts may be corrected. Vehicle, service type, mechanic, work-order link, and record identity remain immutable."
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="history-correction-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            Save audited correction
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Correct maintenance history"
    >
      <form
        className="management-form"
        id="history-correction-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <FormField id="history-service-date" label="Service date" required>
          <Input
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                serviceDate: event.target.value,
              }))
            }
            type="date"
            value={values.serviceDate}
          />
        </FormField>
        <FormField
          id="history-service-mileage"
          label="Odometer at service (km)"
          required
        >
          <Input
            min="0"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                odometerAtService: Number(event.target.value),
              }))
            }
            step="1"
            type="number"
            value={values.odometerAtService}
          />
        </FormField>
        <FormField id="history-service-cost" label="Total cost" required>
          <Input
            min="0"
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                totalCost: Number(event.target.value),
              }))
            }
            step="0.01"
            type="number"
            value={values.totalCost}
          />
        </FormField>
        <FormField
          hint="Explain what was corrected; this becomes part of the audited record."
          id="history-correction-notes"
          label="Service and correction notes"
          required
        >
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
