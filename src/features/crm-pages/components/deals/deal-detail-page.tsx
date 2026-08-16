"use client";

import { X } from "lucide-react";
import Link from "next/link";

import { useDealDetail } from "../../hooks/useDeals";
import { DealDetailDrawer } from "./DealDetailDrawer";
import styles from "../index.module.css";

export function DealDetailPage({ dealId }: { dealId: string }) {
  const {
    createActivity,
    createTask,
    dealQuery,
    isSaving,
    markLost,
    updateDeal,
    updateTask,
  } = useDealDetail(dealId);
  const deal = dealQuery.data?.data;

  if (dealQuery.isLoading) {
    return (
      <div className={styles.dealModalBackdrop}>
        <section className={styles.dealModal}>
          <span className={styles.dealDetailSkeleton} />
          <span className={styles.dealDetailSkeleton} />
        </section>
      </div>
    );
  }

  if (!deal || dealQuery.isError) {
    return (
      <div className={styles.dealModalBackdrop}>
        <section className={styles.dealModal}>
          <div className={styles.dealModalHeader}>
            <p className={styles.formError}>Nu am putut incarca deal-ul.</p>
            <Link className={styles.iconButton} href="/deals">
              <X size={18} />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.dealModalBackdrop}>
      <section aria-modal="true" className={styles.dealModal} role="dialog">
        <div className={styles.dealModalHeader}>
          <div>
            <p className={styles.eyebrow}>Deal</p>
            <h2 className={styles.cardTitle}>{deal.title}</h2>
          </div>
          <Link aria-label="Inchide detaliul" className={styles.iconButton} href="/deals">
            <X size={18} />
          </Link>
        </div>
        <DealDetailDrawer
          deal={deal}
          isSaving={isSaving}
          onAddActivity={createActivity}
          onAddTask={createTask}
          onMarkLost={markLost}
          onUpdateDeal={updateDeal}
          onUpdateTask={updateTask}
        />
      </section>
    </div>
  );
}
