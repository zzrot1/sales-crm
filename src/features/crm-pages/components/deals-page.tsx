"use client";

import { useState } from "react";

import type { DealsDealStageDto, DealsListItemDto } from "@/service-api/generated/models";

import { useDeals } from "../hooks/useDeals";
import { DealKanban } from "./deals/DealKanban";
import { MarkLostDialog } from "./deals/MarkLostDialog";
import styles from "./index.module.css";

export function DealsPage() {
  const { dealsQuery, groupedDeals, isMoving, moveDeal, moveError, setMoveError } =
    useDeals();
  const [lostDeal, setLostDeal] = useState<DealsListItemDto | null>(null);

  const handleMoveDeal = (
    deal: DealsListItemDto,
    nextStage: DealsDealStageDto,
  ) => {
    moveDeal({ deal, nextStage });
  };

  return (
    <div className={styles.page}>
      {dealsQuery.isError || moveError ? (
        <p className={styles.formError}>
          {moveError ?? "Nu am putut incarca deal-urile."}
          {moveError ? (
            <button
              className={styles.inlineTextButton}
              type="button"
              onClick={() => setMoveError(null)}
            >
              Inchide
            </button>
          ) : null}
        </p>
      ) : null}

      <DealKanban
        groupedDeals={groupedDeals}
        isLoading={dealsQuery.isLoading}
        onMoveDeal={handleMoveDeal}
        onRequestLostReason={setLostDeal}
      />

      <MarkLostDialog
        deal={lostDeal}
        isSaving={isMoving}
        onClose={() => setLostDeal(null)}
        onConfirm={(reason) => {
          if (!lostDeal) return;

          moveDeal({ deal: lostDeal, nextStage: "LOST", reason });
          setLostDeal(null);
        }}
      />
    </div>
  );
}
