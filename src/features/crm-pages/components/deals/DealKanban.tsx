import { useState } from "react";

import type {
  DealsDealStageDto,
  DealsListItemDto,
} from "@/service-api/generated/models";
import {
  dealStageLabels,
  dealStages,
} from "../../utils/deal-helpers";
import styles from "../index.module.css";
import { DealCard } from "./DealCard";

export function DealKanban({
  groupedDeals,
  isLoading,
  onMoveDeal,
  onRequestLostReason,
}: {
  groupedDeals: Record<DealsDealStageDto, DealsListItemDto[]>;
  isLoading: boolean;
  onMoveDeal: (deal: DealsListItemDto, stage: DealsDealStageDto) => void;
  onRequestLostReason: (deal: DealsListItemDto) => void;
}) {
  const [draggedDeal, setDraggedDeal] = useState<DealsListItemDto | null>(null);

  return (
    <section className={styles.kanban} aria-label="Deal-uri pe stage">
      {dealStages.map((stage) => {
        const deals = groupedDeals[stage];

        return (
          <div
            className={`${styles.column} ${getStageToneClass(stage)}`}
            key={stage}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();

              if (!draggedDeal || draggedDeal.stage === stage) {
                return;
              }

              if (stage === "LOST") {
                onRequestLostReason(draggedDeal);
                return;
              }

              onMoveDeal(draggedDeal, stage);
            }}
          >
            <div className={styles.columnHeader}>
              <span>{dealStageLabels[stage]}</span>
              <span>{deals.length}</span>
            </div>

            {isLoading ? (
              <KanbanSkeleton />
            ) : deals.length ? (
              deals.map((deal) => (
                <DealCard
                  deal={deal}
                  key={deal.id}
                  onDragStart={setDraggedDeal}
                />
              ))
            ) : (
              <p className={styles.kanbanEmpty}>Niciun deal aici inca</p>
            )}
          </div>
        );
      })}
    </section>
  );
}

function KanbanSkeleton() {
  return (
    <>
      <span className={styles.dealSkeleton} />
      <span className={styles.dealSkeleton} />
      <span className={styles.dealSkeleton} />
    </>
  );
}

function getStageToneClass(stage: DealsDealStageDto) {
  if (stage === "WON") return styles.columnWon;
  if (stage === "LOST") return styles.columnLost;
  return "";
}
