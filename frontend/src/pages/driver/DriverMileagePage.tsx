import { type FormEvent, useMemo, useState } from "react";

import { ErrorState } from "../../components/common/ErrorState";
import { ManagementLoadingState } from "../../components/common/ManagementLoadingState";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FormField } from "../../components/ui/FormField";
import { Input } from "../../components/ui/Input";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table } from "../../components/ui/Table";
import { TextArea } from "../../components/ui/TextArea";
import { useAuth } from "../../hooks/useAuth";
import { useFleetData } from "../../hooks/useFleetData";
import { fleetDataService } from "../../services/fleetDataService";
import { sharedViewService } from "../../services/sharedViewService";
import type { MileageSubmission } from "../../types/fleet";
import { formatDate } from "../../utils/formatDate";
import { getStatusTone } from "../../utils/statusTone";

const today = new Date().toISOString().slice(0, 10);

export default function DriverMileagePage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFleetData();
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [submissionDate, setSubmissionDate] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const mileageView = useMemo(
    () =>
      data && user ? sharedViewService.getDriverMileage(data, user.id) : null,
    [data, user],
  );

  if (isLoading)
    return <ManagementLoadingState label="Loading mileage records" />;
  if (error)
    return (
      <ErrorState
        description={error}
        onRetry={reload}
        title="Mileage records could not be loaded"
      />
    );
  if (!data || !user || !mileageView) return null;

  const submitMileage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    if (vehicle && Number(mileage) < vehicle.mileage) {
      setFeedback({
        message: `Mileage cannot be lower than the current odometer of ${vehicle.mileage.toLocaleString()} km.`,
        tone: "error",
      });
      setIsSubmitting(false);
      return;
    }
    try {
      await fleetDataService.submitMileage(
        {
          mileage: Number(mileage),
          notes,
          submissionDate,
        },
        user.id,
      );
      setMileage("");
      setNotes("");
      setFeedback({
        message:
          "Mileage saved successfully. An existing reading for the selected date was updated when applicable.",
        tone: "success",
      });
    } catch (submitError) {
      setFeedback({
        message:
          submitError instanceof Error
            ? submitError.message
            : "The mileage reading could not be submitted.",
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const vehicle = mileageView.vehicle;
  const history = mileageView.history;

  return (
    <div className="role-dashboard-page">
      <PageHeader
        breadcrumbs={[{ label: "Driver" }, { label: "Mileage" }]}
        eyebrow="Odometer records"
        subtitle="Submit readings only for the vehicle linked to your active driver assignment."
        title="Driver mileage"
      />
      {feedback && (
        <p
          className={`management-feedback management-feedback-${feedback.tone}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
      <div className="mileage-layout">
        <Card eyebrow="Current assignment" title="Assigned vehicle">
          {vehicle ? (
            <div className="assigned-vehicle-card">
              <div>
                <strong>{vehicle.fleetNumber}</strong>
                <span>
                  {vehicle.manufacturer} {vehicle.model} · {vehicle.plate}
                </span>
              </div>
              <StatusBadge tone={getStatusTone(vehicle.status)}>
                {vehicle.status}
              </StatusBadge>
              <dl>
                <div>
                  <dt>Current odometer</dt>
                  <dd>{vehicle.mileage.toLocaleString()} km</dd>
                </div>
                <div>
                  <dt>Assignment started</dt>
                  <dd>
                    {mileageView.assignment
                      ? formatDate(mileageView.assignment.startDate)
                      : "Not available"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="table-muted">
              No active vehicle assignment is linked to this driver account.
            </p>
          )}
        </Card>
        <Card eyebrow="New reading" title="Submit mileage">
          <form className="mileage-form" onSubmit={submitMileage}>
            <FormField
              id="mileage-reading"
              label="Odometer reading (km)"
              required
            >
              <Input
                disabled={!vehicle}
                min={vehicle?.mileage ?? 0}
                onChange={(event) => setMileage(event.target.value)}
                placeholder={
                  vehicle ? String(vehicle.mileage) : "No assigned vehicle"
                }
                step="1"
                type="number"
                value={mileage}
              />
            </FormField>
            <FormField id="mileage-date" label="Submission date" required>
              <Input
                disabled={!vehicle}
                max={today}
                min={mileageView.assignment?.startDate}
                onChange={(event) => setSubmissionDate(event.target.value)}
                type="date"
                value={submissionDate}
              />
            </FormField>
            <FormField
              hint="Optional context such as route, refuel, or inspection notes."
              id="mileage-notes"
              label="Notes"
            >
              <TextArea
                disabled={!vehicle}
                maxLength={400}
                onChange={(event) => setNotes(event.target.value)}
                value={notes}
              />
            </FormField>
            <Button
              disabled={!vehicle || !mileage || !submissionDate}
              isLoading={isSubmitting}
              type="submit"
            >
              Submit mileage
            </Button>
          </form>
        </Card>
      </div>
      <Card eyebrow="Submission log" title="Previous mileage history">
        <Table<MileageSubmission>
          caption="Mileage submissions for the signed-in driver"
          columns={[
            {
              header: "Date",
              key: "date",
              render: (entry) => formatDate(entry.submittedAt),
            },
            {
              align: "right",
              header: "Odometer",
              key: "mileage",
              render: (entry) => `${entry.mileage.toLocaleString()} km`,
            },
            {
              header: "Vehicle",
              key: "vehicle",
              render: (entry) =>
                data.vehicles.find((item) => item.id === entry.vehicleId)
                  ?.fleetNumber ?? "Historical vehicle",
            },
            {
              header: "Notes",
              key: "notes",
              render: (entry) => entry.notes || "No notes",
            },
          ]}
          emptyDescription="Your submitted odometer readings will appear here."
          emptyTitle="No mileage history"
          getRowKey={(entry) => entry.id}
          rows={history}
        />
      </Card>
    </div>
  );
}
