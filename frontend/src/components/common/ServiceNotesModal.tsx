import { useState, type FormEvent } from "react";

import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { TextArea } from "../ui/TextArea";

interface ServiceNotesModalProps {
  currentMileage: number;
  initialNotes: string;
  isOpen: boolean;
  mode: "notes" | "complete";
  onClose: () => void;
  onSubmit: (input: {
    notes: string;
    odometerAtService?: number;
    totalCost?: number;
  }) => Promise<void>;
}

export function ServiceNotesModal({
  currentMileage,
  initialNotes,
  isOpen,
  mode,
  onClose,
  onSubmit,
}: ServiceNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [odometerAtService, setOdometerAtService] = useState(currentMileage);
  const [totalCost, setTotalCost] = useState(0);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (mode === "complete" && !notes.trim()) {
      setError("Service notes are required before completing work.");
      return;
    }
    if (
      mode === "complete" &&
      (!Number.isInteger(odometerAtService) ||
        odometerAtService < currentMileage ||
        !Number.isFinite(totalCost) ||
        totalCost < 0)
    ) {
      setError(
        `Enter a whole-number service mileage of at least ${currentMileage.toLocaleString()} km and a non-negative cost.`,
      );
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({
        notes,
        odometerAtService: completing ? odometerAtService : undefined,
        totalCost: completing ? totalCost : undefined,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ForgeFleet could not update this work order.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const completing = mode === "complete";
  return (
    <Modal
      description={
        completing
          ? "Record the work performed. Completion moves this record into service history."
          : "Keep diagnostic findings and work performed with this work order."
      }
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="service-notes-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            {completing ? "Complete work" : "Save notes"}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={completing ? "Complete work order" : "Update service notes"}
    >
      <form
        className="management-form"
        id="service-notes-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <FormField
          id="service-notes"
          label="Service notes"
          required={completing}
        >
          <TextArea
            autoFocus
            onChange={(event) => setNotes(event.target.value)}
            value={notes}
          />
        </FormField>
        {completing && (
          <>
            <FormField
              hint={`Current vehicle mileage: ${currentMileage.toLocaleString()} km`}
              id="service-odometer"
              label="Odometer at service (km)"
              required
            >
              <Input
                min={currentMileage}
                onChange={(event) =>
                  setOdometerAtService(Number(event.target.value))
                }
                step="1"
                type="number"
                value={odometerAtService}
              />
            </FormField>
            <FormField id="service-cost" label="Total service cost" required>
              <Input
                min="0"
                onChange={(event) => setTotalCost(Number(event.target.value))}
                step="0.01"
                type="number"
                value={totalCost}
              />
            </FormField>
          </>
        )}
        {error && (
          <p className="form-banner form-banner-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
