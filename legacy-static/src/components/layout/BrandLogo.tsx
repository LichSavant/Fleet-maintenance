import { Link } from "react-router-dom";

export interface BrandLogoProps {
  compact?: boolean;
  inverted?: boolean;
  to?: string;
}

export function BrandLogo({
  compact = false,
  inverted = false,
  to = "/",
}: BrandLogoProps) {
  return (
    <Link
      aria-label="ForgeFleet home"
      className={`forge-brand${compact ? " forge-brand-compact" : ""}${inverted ? " forge-brand-inverted" : ""}`}
      to={to}
    >
      <span className="forge-brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && <span>ForgeFleet</span>}
    </Link>
  );
}
