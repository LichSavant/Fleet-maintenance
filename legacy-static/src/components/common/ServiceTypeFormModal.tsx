import { useState, type FormEvent } from "react";

import type { ServiceTypeInput } from "../../types/operations";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { TextArea } from "../ui/TextArea";

interface ServiceTypeFormModalProps {
  initialValues?: (ServiceTypeInput & { id: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: ServiceTypeInput) => Promise<void>;
}

export function ServiceTypeFormModal({
  initialValues,
  isOpen,
  onClose,
  onSubmit,
}: ServiceTypeFormModalProps) {
  const [values, setValues] = useState<ServiceTypeInput>({
    description: initialValues?.description ?? "",
    name: initialValues?.name ?? "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const editing = Boolean(initialValues);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!values.name.trim() || !values.description.trim()) {
      setError("Enter a service type name and description.");
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "ForgeFleet could not save this service type.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      description="Service types provide one reusable reference for schedules, work orders, and history."
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="service-type-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            {editing ? "Save changes" : "Add service type"}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit service type" : "Add service type"}
    >
      <form
        className="management-form"
        id="service-type-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <FormField id="service-type-name" label="Name" required>
          <Input
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
            value={values.name}
          />
        </FormField>
        <FormField id="service-type-description" label="Description" required>
          <TextArea
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            value={values.description}
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
