import type { Vehicle } from "../types/fleet";

/*
 * Vite imports every supported vehicle image placed in this directory.
 * No individual filename is hardcoded into the Driver dashboard.
 */
const importedVehicleAssets = import.meta.glob(
  [
    "../assets/vehicles/*.jpg",
    "../assets/vehicles/*.jpeg",
    "../assets/vehicles/*.png",
    "../assets/vehicles/*.webp",
    "../assets/vehicles/*.avif",
  ],
  {
    eager: true,
    import: "default",
  },
) as Record<string, string>;

const vehicleAssets = Object.entries(importedVehicleAssets)
  .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath))
  .map(([path, url]) => ({
    filename: path.split("/").pop() ?? path,
    url,
  }));

function hashSeed(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/**
 * Returns the assigned vehicle's stored image when one exists.
 *
 * Otherwise, ForgeFleet chooses one local vehicle asset using the
 * vehicle and assignment IDs. This provides a random-looking but
 * stable selection that does not change after every refresh.
 */
export function getVehicleDisplayImage(
  vehicle: Vehicle,
  assignmentId?: string,
): string {
  const uploadedImage = vehicle.imageUrl?.trim();

  if (uploadedImage) {
    return uploadedImage;
  }

  if (vehicleAssets.length === 0) {
    return "";
  }

  const seed = [
    assignmentId ?? "unassigned",
    vehicle.id,
    vehicle.fleetNumber,
  ].join(":");

  const selectedIndex = hashSeed(seed) % vehicleAssets.length;

  return vehicleAssets[selectedIndex]?.url ?? vehicleAssets[0].url;
}

/**
 * Useful for debugging which local asset was selected.
 */
export function getVehicleDisplayImageFilename(
  vehicle: Vehicle,
  assignmentId?: string,
): string | null {
  const uploadedImage = vehicle.imageUrl?.trim();

  if (uploadedImage) {
    return uploadedImage.split("/").pop() ?? uploadedImage;
  }

  if (vehicleAssets.length === 0) {
    return null;
  }

  const seed = [
    assignmentId ?? "unassigned",
    vehicle.id,
    vehicle.fleetNumber,
  ].join(":");

  const selectedIndex = hashSeed(seed) % vehicleAssets.length;

  return vehicleAssets[selectedIndex]?.filename ?? null;
}
