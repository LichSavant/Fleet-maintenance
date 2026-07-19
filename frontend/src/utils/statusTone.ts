import type { StatusTone } from "../components/ui/StatusBadge";

export function getStatusTone(status: string): StatusTone {
  if (["Active", "Completed", "completed", "Converted"].includes(status)) {
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
      "Maintenance",
      "Medium",
      "scheduled",
      "assigned",
      "due_soon",
      "due_now",
    ].includes(status)
  ) {
    return "warning";
  }
  return "neutral";
}
