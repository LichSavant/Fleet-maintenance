import type { StatusTone } from "../components/ui/StatusBadge";

export function getStatusTone(status: string): StatusTone {
  if (
    ["Active", "Completed", "completed", "Converted", "UPCOMING"].includes(
      status,
    )
  ) {
    return "success";
  }
  if (
    [
      "Overdue",
      "Out of Service",
      "High",
      "cancelled",
      "Cancelled",
      "overdue",
      "OVERDUE",
      "DUE_NOW",
    ].includes(status)
  ) {
    return "danger";
  }
  if (["In Progress", "Inspection", "in_progress"].includes(status)) {
    return "info";
  }
  if (
    [
      "Pending",
      "Upcoming",
      "Planned",
      "Maintenance",
      "Medium",
      "scheduled",
      "assigned",
      "due_soon",
      "due_now",
      "DUE_SOON",
      "NO_HISTORY",
    ].includes(status)
  ) {
    return "warning";
  }
  return "neutral";
}
