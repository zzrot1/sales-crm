"use client";

import {
  ChevronDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  LoaderCircle,
  Search,
} from "lucide-react";
import { type PointerEvent as ReactPointerEvent, type ReactNode, useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import styles from "./index.module.css";

type DataTableFilterValue = string | number | boolean | null | undefined;

type DataTableColumnFilterOption = {
  label: ReactNode;
  value: string;
};

type DataTableColumnFilter<TData> = {
  type?: "text" | "select";
  placeholder?: string;
  options?: DataTableColumnFilterOption[];
  getValue?: (row: TData) => DataTableFilterValue;
  match?: (cellValue: DataTableFilterValue, filterValue: string, row: TData) => boolean;
};

export type DataTableColumn<TData> = {
  id: string;
  header: ReactNode;
  cell: (row: TData) => ReactNode;
  canCollapse?: boolean;
  className?: string;
  filter?: DataTableColumnFilter<TData>;
  isFixed?: boolean;
  minWidth?: number;
  width?: number;
};

type ExternalPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pageSizeOptions?: number[];
  rowsLabel?: string;
  pageSizeLabel?: string;
  isDisabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

type DataTableSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  getRowId: (row: TData) => string;
  emptyMessage?: string;
  hasCollapsedColumns?: boolean;
  hasFixedColumns?: boolean;
  hasPagination?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  minWidth?: string;
  onRowClick?: (row: TData) => void;
  pagination?: ExternalPagination;
  paginationSummary?: string;
  rowState?: (row: TData) => string | undefined;
  search?: DataTableSearch;
};

const defaultPageSizeOptions = [10, 25, 50, 100];
const defaultColumnWidth = 180;
const defaultFixedColumnWidth = 280;
const defaultMinColumnWidth = 110;
const defaultFixedMinColumnWidth = 180;

function getFilterValue<TData>(row: TData, column: DataTableColumn<TData>) {
  if (column.filter?.getValue) {
    return column.filter.getValue(row);
  }

  if (row && typeof row === "object" && column.id in row) {
    return (row as Record<string, DataTableFilterValue>)[column.id];
  }

  return undefined;
}

function getUniqueFilterOptions<TData>(
  sourceData: TData[],
  column: DataTableColumn<TData>,
): DataTableColumnFilterOption[] {
  const uniqueValues = new Map<string, string>();

  sourceData.forEach((row) => {
    const value = getFilterValue(row, column);

    if (value === null || value === undefined || value === "") {
      return;
    }

    const stringValue = String(value);
    uniqueValues.set(stringValue, stringValue);
  });

  return [...uniqueValues.entries()]
    .sort(([, left], [, right]) => left.localeCompare(right))
    .map(([value, label]) => ({ label, value }));
}

export function DataTable<TData>({
  columns,
  data,
  emptyMessage = "Nu exista date.",
  getRowId,
  hasCollapsedColumns = false,
  hasFixedColumns = false,
  hasPagination = false,
  isError = false,
  isLoading = false,
  loadingMessage = "Se incarca...",
  minWidth = "58rem",
  onRowClick,
  pagination,
  paginationSummary,
  rowState,
  search,
}: DataTableProps<TData>) {
  const [isColumnPanelOpen, setIsColumnPanelOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(
    defaultPageSizeOptions[0],
  );
  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    new Set(columns.map((column) => column.id)),
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const visibleColumns = columns.filter(
    (column) => !column.canCollapse || visibleColumnIds.has(column.id),
  );
  const collapsibleColumns = columns.filter((column) => column.canCollapse);
  const filterableColumns = columns.filter((column) => column.filter);
  const visibleFilterableColumns = visibleColumns.filter((column) => column.filter);
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length;
  const usesExternalPagination = Boolean(pagination);

  const filterOptions = useMemo(() => {
    return Object.fromEntries(
      filterableColumns.map((column) => [
        column.id,
        column.filter?.options ?? getUniqueFilterOptions(data, column),
      ]),
    );
  }, [data, filterableColumns]);

  const filteredData = useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(([, value]) => value);

    if (!activeFilters.length) {
      return data;
    }

    return data.filter((row) =>
      activeFilters.every(([columnId, filterValue]) => {
        const column = columns.find((item) => item.id === columnId);

        if (!column?.filter) {
          return true;
        }

        const cellValue = getFilterValue(row, column);

        if (column.filter.match) {
          return column.filter.match(cellValue, filterValue, row);
        }

        if ((column.filter.type ?? "text") === "select") {
          return String(cellValue ?? "") === filterValue;
        }

        return String(cellValue ?? "")
          .toLocaleLowerCase()
          .includes(filterValue.toLocaleLowerCase());
      }),
    );
  }, [columnFilters, columns, data]);

  const totalRows = pagination?.total ?? filteredData.length;
  const pageSize = pagination?.pageSize ?? internalPageSize;
  const totalPages =
    pagination?.totalPages ?? Math.max(Math.ceil(filteredData.length / pageSize), 1);
  const page = pagination?.page ?? Math.min(internalPage, totalPages);
  const pageSizeOptions = pagination?.pageSizeOptions ?? defaultPageSizeOptions;

  const visibleData = useMemo(() => {
    if (!hasPagination || usesExternalPagination) {
      return filteredData;
    }

    const startIndex = (page - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, hasPagination, page, pageSize, usesExternalPagination]);

  const goToPage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(nextPage, 1), totalPages);

    if (pagination) {
      pagination.onPageChange(boundedPage);
      return;
    }

    setInternalPage(boundedPage);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    if (pagination) {
      pagination.onPageSizeChange(nextPageSize);
      return;
    }

    setInternalPageSize(nextPageSize);
    setInternalPage(1);
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumnIds((current) => {
      const next = new Set(current);

      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }

      return next;
    });
  };

  const updateColumnFilter = (columnId: string, value: string) => {
    setColumnFilters((current) => ({
      ...current,
      [columnId]: value,
    }));

    if (!pagination) {
      setInternalPage(1);
    }
  };

  const clearColumnFilters = () => {
    setColumnFilters({});

    if (!pagination) {
      setInternalPage(1);
    }
  };

  return (
    <>
      {search ||
      filterableColumns.length ||
      (hasCollapsedColumns && collapsibleColumns.length) ? (
        <div className={styles.toolbar}>
          {search ? (
            <label className={styles.searchBox}>
              <Search size={15} />
              <input
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder ?? "Search..."}
                type="search"
                value={search.value}
              />
            </label>
          ) : (
            <span />
          )}

          <div className={styles.toolbarActions}>
            {filterableColumns.length ? (
              <div className={styles.columnMenu}>
                <button
                  aria-expanded={isFilterPanelOpen}
                  className={styles.columnsButton}
                  onClick={() => setIsFilterPanelOpen((open) => !open)}
                  type="button"
                >
                  <Filter size={15} />
                  Filtre
                  {activeFilterCount ? (
                    <span className={styles.countBadge}>{activeFilterCount}</span>
                  ) : null}
                  <ChevronDown size={14} />
                </button>
                {isFilterPanelOpen ? (
                  <div className={styles.filtersPanel}>
                    <div className={styles.filtersPanelHeader}>
                      <span>Filtre coloane</span>
                      {activeFilterCount ? (
                        <button onClick={clearColumnFilters} type="button">
                          Reseteaza
                        </button>
                      ) : null}
                    </div>
                    {visibleFilterableColumns.map((column) => (
                      <label className={styles.filterField} key={column.id}>
                        <span>{column.header}</span>
                        {(column.filter?.type ?? "text") === "select" ? (
                          <select
                            onChange={(event) =>
                              updateColumnFilter(column.id, event.target.value)
                            }
                            value={columnFilters[column.id] ?? ""}
                          >
                            <option value="">
                              {column.filter?.placeholder ?? "Toate"}
                            </option>
                            {(filterOptions[column.id] ?? []).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            onChange={(event) =>
                              updateColumnFilter(column.id, event.target.value)
                            }
                            placeholder={column.filter?.placeholder ?? "Filtreaza..."}
                            type="search"
                            value={columnFilters[column.id] ?? ""}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasCollapsedColumns && collapsibleColumns.length ? (
            <div className={styles.columnMenu}>
              <button
                aria-expanded={isColumnPanelOpen}
                className={styles.columnsButton}
                onClick={() => setIsColumnPanelOpen((open) => !open)}
                type="button"
              >
                <Columns3 size={15} />
                Coloane
                <ChevronDown size={14} />
              </button>
              {isColumnPanelOpen ? (
                <div className={styles.columnsPanel}>
                  {collapsibleColumns.map((column) => (
                    <label className={styles.columnToggle} key={column.id}>
                      <input
                        checked={visibleColumnIds.has(column.id)}
                        onChange={() => toggleColumn(column.id)}
                        type="checkbox"
                      />
                      {column.header}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={styles.scroll}>
        <Table className={styles.table} style={{ minWidth }}>
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                key={column.id}
                style={{ width: `${getColumnWidth(column, visibleColumns)}px` }}
              />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead
                  className={cn(
                    column.className,
                    isFixedColumn(column, visibleColumns) && styles.fixedColumn,
                  )}
                  key={column.id}
                >
                  <div className={styles.headerContent}>
                    <span>{column.header}</span>
                    <button
                      aria-label={`Resize ${String(column.header)} column`}
                      className={styles.resizeHandle}
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) =>
                        startColumnResize(event, column, visibleColumns)
                      }
                      type="button"
                    />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && !isError && visibleData.length ? (
              visibleData.map((row) => (
                <TableRow
                  className={onRowClick ? styles.clickableRow : undefined}
                  data-state={rowState?.(row)}
                  key={getRowId(row)}
                  onClick={() => onRowClick?.(row)}
                  onKeyDown={(event) => {
                    if (!onRowClick) {
                      return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                >
                  {visibleColumns.map((column) => (
                    <TableCell
                      className={cn(
                        column.className,
                        isFixedColumn(column, visibleColumns) && styles.fixedColumn,
                      )}
                      key={column.id}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : null}
          </TableBody>
        </Table>
        {isLoading || isError || !visibleData.length ? (
          <div className={styles.emptyOverlay}>
            <span className={styles.emptyStateContent}>
              {isLoading ? (
                <LoaderCircle className={styles.spinner} size={16} />
              ) : null}
              {isLoading
                ? loadingMessage
                : isError
                  ? "Nu am putut incarca datele."
                  : emptyMessage}
            </span>
          </div>
        ) : null}
      </div>

      {hasPagination ? (
        <footer className={styles.pagination}>
          <span className={styles.selectionCount}>
            {paginationSummary ?? pagination?.rowsLabel ?? `${totalRows} row(s)`}
          </span>
          <div className={styles.paginationControls}>
            <label className={styles.rowsPerPage}>
              {pagination?.pageSizeLabel ?? "Rows per page"}
              <select
                aria-label={pagination?.pageSizeLabel ?? "Rows per page"}
                className={styles.pageSize}
                onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                value={pageSize}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <span className={styles.pageCount}>
              Page {page} of {totalPages}
            </span>
            <div className={styles.pageButtons}>
              <button
                aria-label="First page"
                disabled={page <= 1 || pagination?.isDisabled}
                onClick={() => goToPage(1)}
                type="button"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                aria-label="Previous page"
                disabled={page <= 1 || pagination?.isDisabled}
                onClick={() => goToPage(page - 1)}
                type="button"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label="Next page"
                disabled={page >= totalPages || pagination?.isDisabled}
                onClick={() => goToPage(page + 1)}
                type="button"
              >
                <ChevronRight size={16} />
              </button>
              <button
                aria-label="Last page"
                disabled={page >= totalPages || pagination?.isDisabled}
                onClick={() => goToPage(totalPages)}
                type="button"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </footer>
      ) : null}
    </>
  );

  function isFixedColumn(
    column: DataTableColumn<TData>,
    currentVisibleColumns: DataTableColumn<TData>[],
  ) {
    if (!hasFixedColumns) {
      return false;
    }

    return column.isFixed || column.id === currentVisibleColumns[0]?.id;
  }

  function getColumnWidth(
    column: DataTableColumn<TData>,
    currentVisibleColumns: DataTableColumn<TData>[],
  ) {
    return (
      columnWidths[column.id] ??
      column.width ??
      (isFixedColumn(column, currentVisibleColumns)
        ? defaultFixedColumnWidth
        : defaultColumnWidth)
    );
  }

  function getMinColumnWidth(
    column: DataTableColumn<TData>,
    currentVisibleColumns: DataTableColumn<TData>[],
  ) {
    return (
      column.minWidth ??
      (isFixedColumn(column, currentVisibleColumns)
        ? defaultFixedMinColumnWidth
        : defaultMinColumnWidth)
    );
  }

  function startColumnResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    column: DataTableColumn<TData>,
    currentVisibleColumns: DataTableColumn<TData>[],
  ) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = getColumnWidth(column, currentVisibleColumns);
    const minWidth = getMinColumnWidth(column, currentVisibleColumns);
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.max(minWidth, startWidth + moveEvent.clientX - startX);
      setColumnWidths((current) => ({
        ...current,
        [column.id]: nextWidth,
      }));
    };

    const handlePointerUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

}
