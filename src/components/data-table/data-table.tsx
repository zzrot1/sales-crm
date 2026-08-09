"use client";

import {
  ChevronDown,
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

export type DataTableColumn<TData> = {
  id: string;
  header: ReactNode;
  cell: (row: TData) => ReactNode;
  canCollapse?: boolean;
  className?: string;
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
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(
    defaultPageSizeOptions[0],
  );
  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    new Set(columns.map((column) => column.id)),
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const visibleColumns = columns.filter(
    (column) => !column.canCollapse || visibleColumnIds.has(column.id),
  );
  const collapsibleColumns = columns.filter((column) => column.canCollapse);
  const usesExternalPagination = Boolean(pagination);
  const totalRows = pagination?.total ?? data.length;
  const pageSize = pagination?.pageSize ?? internalPageSize;
  const totalPages =
    pagination?.totalPages ?? Math.max(Math.ceil(data.length / pageSize), 1);
  const page = pagination?.page ?? Math.min(internalPage, totalPages);
  const pageSizeOptions = pagination?.pageSizeOptions ?? defaultPageSizeOptions;

  const visibleData = useMemo(() => {
    if (!hasPagination || usesExternalPagination) {
      return data;
    }

    const startIndex = (page - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, hasPagination, page, pageSize, usesExternalPagination]);

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

  return (
    <>
      {search || (hasCollapsedColumns && collapsibleColumns.length) ? (
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
            {isLoading ? (
              <TableRow>
                <TableCell className={styles.emptyCell} colSpan={visibleColumns.length}>
                  <LoaderCircle className={styles.spinner} size={16} />
                  {loadingMessage}
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell className={styles.emptyCell} colSpan={visibleColumns.length}>
                  Nu am putut incarca datele.
                </TableCell>
              </TableRow>
            ) : visibleData.length ? (
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
            ) : (
              <TableRow>
                <TableCell className={styles.emptyCell} colSpan={visibleColumns.length}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
