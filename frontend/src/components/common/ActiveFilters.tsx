import { Button } from "../ui/Button";

export interface ActiveFiltersProps {
  filters: readonly string[];
  onClear: () => void;
}

export function ActiveFilters({ filters, onClear }: ActiveFiltersProps) {
  return (
    <div className="active-filters">
      <div aria-live="polite" className="active-filters-summary">
        {filters.length === 0 ? (
          <span>No active filters</span>
        ) : (
          <>
            <span>Active filters:</span>
            <ul aria-label="Applied filters">
              {filters.map((filter) => (
                <li key={filter}>{filter}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <Button
        aria-label="Clear all search and filters"
        disabled={filters.length === 0}
        onClick={onClear}
        size="small"
        variant="ghost"
      >
        Clear filters
      </Button>
    </div>
  );
}
