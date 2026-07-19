import type { UserRole } from "../types/auth";
import type { AuditEntityType, AuditEvent, FleetState } from "../types/fleet";

export interface AuditLogFilters {
  entityType: AuditEntityType | "all";
  role: UserRole | "all";
  search: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export const auditLogService = {
  canView(role: UserRole) {
    return role === "admin";
  },

  getEvents(data: FleetState, filters: AuditLogFilters) {
    const query = normalize(filters.search);
    return [...data.auditEvents]
      .filter((event) => filters.role === "all" || event.role === filters.role)
      .filter(
        (event) =>
          filters.entityType === "all" ||
          event.entityType === filters.entityType,
      )
      .filter((event) => {
        if (!query) return true;
        return [
          event.userDisplayName,
          event.userId,
          event.role,
          event.action,
          event.entityType,
          event.entityId,
          event.description,
        ].some((value) => normalize(value).includes(query));
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
  },

  getEntityTypes(data: FleetState) {
    return [...new Set(data.auditEvents.map((event) => event.entityType))].sort(
      (left, right) => left.localeCompare(right),
    );
  },
};

export function formatAuditEntityType(entityType: AuditEvent["entityType"]) {
  return entityType.replaceAll("_", " ");
}
