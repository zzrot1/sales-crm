"use client";

import { Check, ChevronDown, LoaderCircle, MoreVertical } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/data-table";
import styles from "./index.module.css";

type SectionStatus = "Done" | "In Process";

export type SectionRow = {
  id: string;
  header: string;
  type: string;
  status: SectionStatus;
  target: number;
  limit: number;
  reviewer: string;
};

const baseSections: Omit<SectionRow, "id">[] = [
  {
    header: "Cover page",
    type: "Cover page",
    status: "In Process",
    target: 18,
    limit: 5,
    reviewer: "Eddie Lake",
  },
  {
    header: "Table of contents",
    type: "Table of contents",
    status: "Done",
    target: 29,
    limit: 24,
    reviewer: "Eddie Lake",
  },
  {
    header: "Executive summary",
    type: "Narrative",
    status: "Done",
    target: 10,
    limit: 13,
    reviewer: "Eddie Lake",
  },
  {
    header: "Technical approach",
    type: "Narrative",
    status: "Done",
    target: 27,
    limit: 23,
    reviewer: "Jamik Tashpulatov",
  },
  {
    header: "Design",
    type: "Narrative",
    status: "In Process",
    target: 2,
    limit: 16,
    reviewer: "Jamik Tashpulatov",
  },
  {
    header: "Capabilities",
    type: "Narrative",
    status: "In Process",
    target: 20,
    limit: 8,
    reviewer: "Jamik Tashpulatov",
  },
  {
    header: "Integration with existing systems",
    type: "Narrative",
    status: "In Process",
    target: 19,
    limit: 21,
    reviewer: "Jamik Tashpulatov",
  },
  {
    header: "Innovation and Advantages",
    type: "Narrative",
    status: "Done",
    target: 25,
    limit: 26,
    reviewer: "Assign reviewer",
  },
  {
    header: "Overview of EMR's Innovative Solutions",
    type: "Technical content",
    status: "Done",
    target: 7,
    limit: 23,
    reviewer: "Assign reviewer",
  },
  {
    header: "Advanced Algorithms and Machine Learning",
    type: "Narrative",
    status: "Done",
    target: 30,
    limit: 28,
    reviewer: "Assign reviewer",
  },
];

const sections: SectionRow[] = Array.from({ length: 68 }, (_, index) => {
  const section = baseSections[index % baseSections.length];
  return {
    ...section,
    id: `section-${index + 1}`,
    header:
      index < baseSections.length ? section.header : `${section.header} ${index + 1}`,
  };
});

export function SectionsDataTable() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allRowsSelected = selectedIds.size === sections.length;

  const columns = useMemo<DataTableColumn<SectionRow>[]>(
    () => [
      {
        id: "select",
        header: (
          <input
            aria-label="Select all rows"
            checked={allRowsSelected}
            className={styles.checkboxInput}
            onChange={() => {
              setSelectedIds(allRowsSelected ? new Set() : new Set(sections.map((row) => row.id)));
            }}
            type="checkbox"
          />
        ),
        cell: (section) => (
          <input
            aria-label={`Select ${section.header}`}
            checked={selectedIds.has(section.id)}
            className={styles.checkboxInput}
            onChange={() => {
              setSelectedIds((current) => {
                const next = new Set(current);

                if (next.has(section.id)) {
                  next.delete(section.id);
                } else {
                  next.add(section.id);
                }

                return next;
              });
            }}
            type="checkbox"
          />
        ),
      },
      {
        id: "header",
        header: "Header",
        cell: (section) => <span className={styles.headerCell}>{section.header}</span>,
      },
      {
        canCollapse: true,
        id: "type",
        header: "Section Type",
        cell: (section) => <span className={styles.typeBadge}>{section.type}</span>,
      },
      {
        canCollapse: true,
        id: "status",
        header: "Status",
        cell: (section) => {
          const isDone = section.status === "Done";
          return (
            <span
              className={`${styles.statusBadge} ${
                isDone ? styles.doneStatus : styles.processStatus
              }`}
            >
              {isDone ? <Check size={11} /> : <LoaderCircle size={11} />}
              {section.status}
            </span>
          );
        },
      },
      {
        canCollapse: true,
        id: "target",
        header: "Target",
        cell: (section) => <span className={styles.numberCell}>{section.target}</span>,
      },
      {
        canCollapse: true,
        id: "limit",
        header: "Limit",
        cell: (section) => <span className={styles.numberCell}>{section.limit}</span>,
      },
      {
        canCollapse: true,
        id: "reviewer",
        header: "Reviewer",
        cell: (section) =>
          section.reviewer === "Assign reviewer" ? (
            <button className={styles.reviewerSelect} type="button">
              Assign reviewer <ChevronDown size={14} />
            </button>
          ) : (
            <span className={styles.reviewer}>{section.reviewer}</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: (section) => (
          <button
            aria-label={`Actions for ${section.header}`}
            className={styles.moreButton}
            type="button"
          >
            <MoreVertical size={16} />
          </button>
        ),
      },
    ],
    [allRowsSelected, selectedIds],
  );

  return (
    <section className={styles.dataGrid} aria-label="Sections data grid">
      <DataTable
        columns={columns}
        data={sections}
        getRowId={(section) => section.id}
        hasCollapsedColumns
        hasPagination
        minWidth="72rem"
        paginationSummary={`${selectedIds.size} of ${sections.length} row(s) selected.`}
        rowState={(section) => (selectedIds.has(section.id) ? "selected" : undefined)}
      />
    </section>
  );
}
