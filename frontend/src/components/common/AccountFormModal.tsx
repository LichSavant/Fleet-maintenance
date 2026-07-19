import { useState, type FormEvent } from "react";

import type { UserRole } from "../../types/auth";
import { ManagementError, type UserAccountInput } from "../../types/management";
import { isRequired, isValidEmail } from "../../utils/validation";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";

export interface AccountFormValues extends UserAccountInput {
  id?: string;
}

export interface AccountFormModalProps {
  fixedRole?: UserRole;
  initialValues?: AccountFormValues | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: UserAccountInput) => Promise<void>;
}

interface AccountFormErrors {
  depot?: string;
  email?: string;
  fullName?: string;
  licenseNumber?: string;
  specialty?: string;
}

const EMPTY_VALUES: UserAccountInput = {
  depot: "",
  email: "",
  fullName: "",
  licenseNumber: "",
  role: "driver",
  specialty: "",
};

export function AccountFormModal({
  fixedRole,
  initialValues,
  isOpen,
  onClose,
  onSubmit,
}: AccountFormModalProps) {
  const [values, setValues] = useState<UserAccountInput>(() => ({
    ...EMPTY_VALUES,
    ...initialValues,
    role: fixedRole ?? initialValues?.role ?? "driver",
  }));
  const [errors, setErrors] = useState<AccountFormErrors>({});
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(initialValues?.id);

  const update = (field: keyof UserAccountInput, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: AccountFormErrors = {};
    if (!isRequired(values.fullName))
      nextErrors.fullName = "Enter a full name.";
    if (!isValidEmail(values.email))
      nextErrors.email = "Enter a valid email address.";
    if (values.role === "driver" && !isRequired(values.licenseNumber ?? "")) {
      nextErrors.licenseNumber = "Enter a license number.";
    }
    if (values.role === "mechanic" && !isRequired(values.specialty ?? "")) {
      nextErrors.specialty = "Enter a specialty.";
    }
    if (values.role === "manager" && !isRequired(values.depot ?? "")) {
      nextErrors.depot = "Enter a depot.";
    }
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
          : "ForgeFleet could not save this account.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      description={
        isEditing
          ? "Update this account and its linked role profile."
          : "The account and any required role profile are created together."
      }
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="account-management-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            {isEditing ? "Save changes" : "Create account"}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit account" : "Add account"}
    >
      <form
        className="management-form"
        id="account-management-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="form-grid form-grid-two">
          <FormField
            error={errors.fullName}
            id="account-full-name"
            label="Full name"
            required
          >
            <Input
              autoComplete="name"
              onChange={(event) => update("fullName", event.target.value)}
              value={values.fullName}
            />
          </FormField>
          <FormField
            error={errors.email}
            id="account-email"
            label="Email address"
            required
          >
            <Input
              autoComplete="email"
              onChange={(event) => update("email", event.target.value)}
              type="email"
              value={values.email}
            />
          </FormField>
        </div>
        <FormField
          hint={
            isEditing
              ? "Roles cannot be changed after account creation."
              : undefined
          }
          id="account-role"
          label="Role"
          required
        >
          <Select
            disabled={Boolean(fixedRole) || isEditing}
            onChange={(event) => update("role", event.target.value)}
            value={values.role}
          >
            <option value="admin">Administrator</option>
            <option value="manager">Manager</option>
            <option value="mechanic">Mechanic</option>
            <option value="driver">Driver</option>
          </Select>
        </FormField>
        {values.role === "driver" && (
          <FormField
            error={errors.licenseNumber}
            id="account-license"
            label="License number"
            required
          >
            <Input
              onChange={(event) => update("licenseNumber", event.target.value)}
              value={values.licenseNumber}
            />
          </FormField>
        )}
        {values.role === "mechanic" && (
          <FormField
            error={errors.specialty}
            id="account-specialty"
            label="Specialty"
            required
          >
            <Input
              onChange={(event) => update("specialty", event.target.value)}
              value={values.specialty}
            />
          </FormField>
        )}
        {values.role === "manager" && (
          <FormField
            error={errors.depot}
            id="account-depot"
            label="Depot"
            required
          >
            <Input
              onChange={(event) => update("depot", event.target.value)}
              value={values.depot}
            />
          </FormField>
        )}
        {formError && (
          <p className="form-banner form-banner-error" role="alert">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}
