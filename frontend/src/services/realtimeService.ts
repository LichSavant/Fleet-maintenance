import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";

const FLEET_REALTIME_TABLES = [
  "profiles",
  "manager_profiles",
  "driver_profiles",
  "mechanic_profiles",
  "vehicles",
  "service_types",
  "vehicle_assignments",
  "maintenance_schedules",
  "work_orders",
  "service_history",
  "mileage_submissions",
  "notifications",
  "system_activity",
] as const;

export type FleetRealtimeStatus =
  "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

interface SubscribeOptions {
  onChange: () => void;
  onStatus?: (status: FleetRealtimeStatus) => void;
  userId: string;
}

export const realtimeService = {
  subscribeToFleetChanges({
    onChange,
    onStatus,
    userId,
  }: SubscribeOptions): () => void {
    let debounceTimer: number | undefined;

    const scheduleRefresh = () => {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(onChange, 250);
    };

    let channel: RealtimeChannel = supabase.channel(
      `forgefleet-live-${userId}-${crypto.randomUUID()}`,
    );

    for (const table of FLEET_REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        scheduleRefresh,
      );
    }

    channel.subscribe((status) => {
      if (
        status === "SUBSCRIBED" ||
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        onStatus?.(status);
      }
    });

    return () => {
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  },
};
