import { Button } from "./Button";
import { Icon } from "./Icon";

export interface PaginationProps {
  currentPage: number;
  label?: string;
  onPageChange: (page: number) => void;
  totalPages: number;
}

export function Pagination({
  currentPage,
  label = "Pagination",
  onPageChange,
  totalPages,
}: PaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = Math.min(Math.max(1, currentPage), safeTotal);

  return (
    <nav aria-label={label} className="pagination">
      <Button
        aria-label="Go to previous page"
        disabled={safeCurrent === 1}
        leadingIcon={<Icon name="chevron-left" size={17} />}
        onClick={() => onPageChange(safeCurrent - 1)}
        size="small"
        variant="ghost"
      >
        Previous
      </Button>
      <span aria-live="polite" className="pagination-status">
        Page <strong>{safeCurrent}</strong> of <strong>{safeTotal}</strong>
      </span>
      <Button
        aria-label="Go to next page"
        disabled={safeCurrent === safeTotal}
        onClick={() => onPageChange(safeCurrent + 1)}
        size="small"
        variant="ghost"
      >
        Next
        <Icon name="chevron-right" size={17} />
      </Button>
    </nav>
  );
}
