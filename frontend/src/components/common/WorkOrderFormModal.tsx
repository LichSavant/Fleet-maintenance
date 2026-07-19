import { useState, type FormEvent } from "react";

import type { FleetState, Priority } from "../../types/fleet";
import type { WorkOrderInput } from "../../types/operations";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { TextArea } from "../ui/TextArea";

interface WorkOrderFormModalProps {
  data: FleetState;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: WorkOrderInput) => Promise<void>;
}

const EMPTY_WORK_ORDER: WorkOrderInput = {
  notes: "",
  priority: "Medium",
  scheduledDate: "",
  serviceTypeId: "",
  vehicleId: "",
};

export function WorkOrderFormModal({
  data,
  isOpen,
  onClose,
  onSubmit,
}: WorkOrderFormModalProps) {
  const [values, setValues] = useState(EMPTY_WORK_ORDER);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const availableSchedules = data.maintenanceSchedules.filter(
    (schedule) =>
      schedule.status === "Upcoming" || schedule.status === "Overdue",
  );
  const mechanics = data.mechanicProfiles.flatMap((profile) => {
    const user = data.users.find((item) => item.id === profile.userId);
    return profile.status === "Active" && user?.status === "Active"
      ? [{ profile, user }]
      : [];
  });

  const selectSchedule = (scheduleId: string) => {
    const schedule = availableSchedules.find((item) => item.id === scheduleId);
    setValues((current) =>
      schedule
        ? {
            ...current,
            assignedMechanicId: schedule.assignedMechanicId ?? undefined,
            notes: schedule.notes,
            scheduleId: schedule.id,
            scheduledDate: schedule.dueDate,
            serviceTypeId: schedule.serviceTypeId,
            vehicleId: schedule.vehicleId,
          }
        : { ...EMPTY_WORK_ORDER, priority: current.priority },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!values.vehicleId || !values.serviceTypeId || !values.scheduledDate) {
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
          : "ForgeFleet could not create this work order.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      description="Create an ad hoc work order or convert one maintenance schedule. Linked schedules cannot be converted twice."
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button
            form="work-order-form"
            isLoading={isSaving}
            type="submit"
            variant="primary"
          >
            Create work order
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Create maintenance work order"
    >
      <form
        className="management-form"
        id="work-order-form"
        noValidate
        onSubmit={handleSubmit}
      >
        <FormField
          hint="Optional. Selecting a schedule fills its linked vehicle, service, date, mechanic, and notes."
          id="work-order-schedule"
          label="Maintenance schedule"
        >
          <Select
            onChange={(event) => selectSchedule(event.target.value)}
            value={values.scheduleId ?? ""}
          >
            <option value="">Ad hoc work order</option>
            {availableSchedules.map((schedule) => {
              const vehicle = data.vehicles.find(
                (item) => item.id === schedule.vehicleId,
              );
              const service = data.serviceTypes.find(
                (item) => item.id === schedule.serviceTypeId,
              );
              return (
                <option key={schedule.id} value={schedule.id}>
                  {vehicle?.fleetNumber} · {service?.name} · {schedule.dueDate}
                </option>
              );
            })}
          </Select>
        </FormField>
        <div className="form-grid">
          <FormField id="work-order-vehicle" label="Vehicle" required>
            <Select
              disabled={Boolean(values.scheduleId)}
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
          <FormField id="work-order-service" label="Service type" required>
            <Select
              disabled={Boolean(values.scheduleId)}
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
                .filter((item) => item.status === "Active")
                .map((serviceType) => (
                  <option key={serviceType.id} value={serviceType.id}>
                    {serviceType.name}
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField id="work-order-date" label="Scheduled date" required>
            <Input
              disabled={Boolean(values.scheduleId)}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  scheduledDate: event.target.value,
                }))
              }
              type="date"
              value={values.scheduledDate}
            />
          </FormField>
          <FormField id="work-order-priority" label="Priority" required>
            <Select
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  priority: event.target.value as Priority,
                }))
              }
              value={values.priority}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </Select>
          </FormField>
          <FormField id="work-order-mechanic" label="Assigned mechanic">
            <Select
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  assignedMechanicId: event.target.value || undefined,
                }))
              }
              value={values.assignedMechanicId ?? ""}
            >
              <option value="">Assign later</option>
              {mechanics.map(({ profile, user }) => (
                <option key={profile.id} value={profile.id}>
                  {user.fullName} · {profile.specialization}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField id="work-order-notes" label="Work instructions">
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
