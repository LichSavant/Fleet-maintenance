import { useState, type FormEvent } from "react";

import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Modal } from "../ui/Modal";
import { TextArea } from "../ui/TextArea";

interface ServiceNotesModalProps {
  initialNotes: string;
  isOpen: boolean;
  mode: "notes" | "complete";
  onClose: () => void;
  onSubmit: (notes: string) => Promise<void>;
}

export function ServiceNotesModal({
  initialNotes,
  isOpen,
  mode,
  onClose,
  onSubmit,
}: ServiceNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (mode === "complete" && !notes.trim()) {
      setError("Service notes are required before completing work.");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(notes);
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
        {error && (
          <p className="form-banner form-banner-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
