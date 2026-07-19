import { useCallback, useEffect, useState } from "react";

import {
  FLEET_DATA_CHANGED_EVENT,
  fleetDataService,
} from "../services/fleetDataService";
import type { FleetDataSource } from "../types/fleet";
import { useAuth } from "./useAuth";

export function useFleetData() {
  const { user } = useAuth();
  const [data, setData] = useState<FleetDataSource | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(user));

  const reload = useCallback(async () => {
    if (!user) {
      setData(null);
      setIsLoading(false);
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      setData(await fleetDataService.load());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ForgeFleet could not load the fleet records.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Initial remote synchronization is intentionally initiated from this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  useEffect(() => {
    const syncData = () => {
      setData(fleetDataService.getSnapshot());
      setError("");
    };
    window.addEventListener(FLEET_DATA_CHANGED_EVENT, syncData);
    return () => window.removeEventListener(FLEET_DATA_CHANGED_EVENT, syncData);
  }, []);

  return { data, error, isLoading, reload };
}
