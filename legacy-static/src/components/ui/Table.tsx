import type { ReactNode } from "react";

import { classNames } from "../../utils/classNames";
import { EmptyState } from "../common/EmptyState";

export interface TableColumn<T> {
  align?: "left" | "center" | "right";
  header: string;
  key: string;
  render: (row: T) => ReactNode;
}

export interface TableProps<T> {
  caption: string;
  columns: Array<TableColumn<T>>;
  emptyDescription?: string;
  emptyTitle?: string;
  getRowKey: (row: T) => string;
  rows: T[];
}

export function Table<T>({
  caption,
  columns,
  emptyDescription = "No records are available for this view.",
  emptyTitle = "No records found",
  getRowKey,
  rows,
}: TableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="table-scroll" tabIndex={0}>
      <table className="data-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={classNames(
                  column.align && `table-align-${column.align}`,
                )}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  className={classNames(
                    column.align && `table-align-${column.align}`,
                  )}
                  key={column.key}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
