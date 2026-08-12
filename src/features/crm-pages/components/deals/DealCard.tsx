import Link from "next/link";

import type { DealsListItemDto } from "@/service-api/generated/models";

import {
  formatDealValue,
  formatShortDate,
  getContactName,
} from "../../utils/deal-helpers";
import styles from "../index.module.css";

export function DealCard({
  deal,
  onDragStart,
}: {
  deal: DealsListItemDto;
  onDragStart: (deal: DealsListItemDto) => void;
}) {
  const value = formatDealValue(deal.value);
  const nextTaskDate = formatShortDate(deal.nextTask?.dueDate);
  const contactName = getContactName(deal.contact);

  return (
    <Link
      className={styles.dealCard}
      draggable
      href={`/deals/${deal.id}`}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", deal.id);
        onDragStart(deal);
      }}
    >
      <span className={styles.dealName}>{deal.title}</span>
      <span className={styles.muted}>{deal.company.name}</span>
      {contactName ? <span className={styles.muted}>{contactName}</span> : null}
      {value ? (
        <span className={styles.dealMeta}>{value}</span>
      ) : nextTaskDate ? (
        <span className={styles.dealMeta}>Task: {nextTaskDate}</span>
      ) : null}
    </Link>
  );
}
