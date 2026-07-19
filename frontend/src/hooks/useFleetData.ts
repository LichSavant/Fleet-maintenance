import { useCallback, useEffect, useState } from "react";

import {
  FLEET_DATA_CHANGED_EVENT,
  fleetDataService,
} from "../services/fleetDataService";
import type { FleetState } from "../types/fleet";

export function useFleetData() {
  const [data, setData] = useState<FleetState | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      setData(await fleetDataService.load());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ForgeFleet could not load the demonstration records.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fleetDataService
      .load()
      .then((nextData) => {
        if (active) setData(nextData);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "ForgeFleet could not load the demonstration records.",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
