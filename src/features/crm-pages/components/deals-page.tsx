"use client";

import { useMemo, useState } from "react";

import type { DealsDealStageDto, DealsListItemDto } from "@/service-api/generated/models";

import { useDeals } from "../hooks/useDeals";
import { DealKanban } from "./deals/DealKanban";
import { MarkLostDialog } from "./deals/MarkLostDialog";
import styles from "./index.module.css";

export function DealsPage() {
  const [companyId, setCompanyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filters = useMemo(
    () => ({ companyId, dateFrom, dateTo }),
    [companyId, dateFrom, dateTo],
  );
  const { dealsQuery, groupedDeals, isMoving, moveDeal, moveError, setMoveError } =
    useDeals(filters);
  const [lostDeal, setLostDeal] = useState<DealsListItemDto | null>(null);
  const companyOptions = useMemo(() => {
    const companies = new Map<string, string>();

    dealsQuery.data?.data.forEach((deal) => {
      companies.set(deal.company.id, deal.company.name);
    });

    return Array.from(companies, ([id, name]) => ({ id, name })).sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [dealsQuery.data?.data]);
  const hasActiveFilters = Boolean(companyId || dateFrom || dateTo);

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

      <section className={styles.dealFilters} aria-label="Filtre deal-uri">
        <label className={styles.dealFilterField}>
          <span>Companie</span>
          <select
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
          >
            <option value="">Toate companiile</option>
            {companyOptions.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.dealFilterField}>
          <span>Close date de la</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              const nextDateFrom = event.target.value;

              setDateFrom(nextDateFrom);
              if (dateTo && nextDateFrom && dateTo < nextDateFrom) {
                setDateTo(nextDateFrom);
              }
            }}
          />
        </label>

        <label className={styles.dealFilterField}>
          <span>Close date pana la</span>
          <input
            min={dateFrom || undefined}
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </label>

        <button
          className={styles.ghostButton}
          disabled={!hasActiveFilters}
          type="button"
          onClick={() => {
            setCompanyId("");
            setDateFrom("");
            setDateTo("");
          }}
        >
          Reseteaza
        </button>
      </section>

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
