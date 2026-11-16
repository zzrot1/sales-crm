import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";

import type { CuiDiscoveryStatusDto } from "@/service-api/generated/models";

import type { CuiDiscovery } from "../../hooks/use-cui-discovery";
import styles from "../index.module.css";

function describeProgress(status: CuiDiscoveryStatusDto) {
  switch (status.phase) {
    case "websites":
      return `Citesc site-urile: ${status.websitesRead} din ${status.total}`;
    case "registry":
      return "Verific CUI-urile la ANAF...";
    case "latestYear":
      return `Aduc cifrele de afaceri: ${status.saved} din ${status.matched}`;
    case "history":
      return `Gata ${status.matched}. Aduc si istoricul pe 5 ani...`;
    default:
      return "Caut CUI-urile...";
  }
}

function describeResult(status: CuiDiscoveryStatusDto) {
  return `Am gasit ${status.matched} CUI-uri. Fara CUI pe site: ${status.notFound}.`;
}

/**
 * Butonul "Gaseste CUI-urile", progresul jobului si, la final, firmele la care
 * CUI-ul gasit pe site nu seamana cu numele: acolo decizia e a omului.
 */
export function CuiDiscoveryControl({
  discovery,
  withoutDataCount,
}: {
  discovery: CuiDiscovery;
  withoutDataCount: number | undefined;
}) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const { status, needsReview } = discovery;
  const isRunning = status?.state === "running";

  if (!discovery.canRun) return null;

  return (
    <div className={styles.discovery}>
      <div className={styles.discoveryRow}>
        {isRunning && status ? (
          <span className={styles.discoveryProgress} role="status">
            <LoaderCircle className={styles.spinner} size={15} />
            {describeProgress(status)}
          </span>
        ) : (
          <>
            {status?.state === "done" ? (
              <span className={styles.muted}>{describeResult(status)}</span>
            ) : null}
            {status?.state === "failed" ? (
              <span className={styles.formError}>{status.error}</span>
            ) : null}
            {needsReview.length ? (
              <button
                aria-expanded={isReviewOpen}
                className={styles.secondaryButton}
                onClick={() => setIsReviewOpen((open) => !open)}
                type="button"
              >
                De confirmat ({needsReview.length})
              </button>
            ) : null}
            {withoutDataCount ? (
              <button
                className={styles.button}
                disabled={discovery.isStarting}
                onClick={discovery.start}
                title="Caut CUI-ul pe site-ul fiecarei firme si il verific la ANAF"
                type="button"
              >
                {discovery.isStarting ? (
                  <LoaderCircle className={styles.spinner} size={15} />
                ) : (
                  <Search size={15} />
                )}
                Gaseste CUI-urile ({withoutDataCount})
              </button>
            ) : null}
          </>
        )}
      </div>

      {isReviewOpen && needsReview.length && !isRunning ? (
        <ul className={styles.reviewList}>
          {needsReview.map((item) => (
            <li key={item.companyId}>
              <strong>{item.companyName}</strong>
              <div className={styles.reviewCandidates}>
                {item.candidates.map((candidate) => (
                  <button
                    className={styles.secondaryButton}
                    disabled={discovery.confirmingCompanyId === item.companyId}
                    key={candidate.cui}
                    onClick={() => discovery.confirm(item.companyId, candidate.cui)}
                    type="button"
                  >
                    {discovery.confirmingCompanyId === item.companyId ? (
                      <LoaderCircle className={styles.spinner} size={14} />
                    ) : null}
                    {candidate.legalName ?? "Firma necunoscuta"} · CUI {candidate.cui}
                  </button>
                ))}
                <button
                  className={styles.ghostButton}
                  onClick={() => discovery.dismiss(item.companyId)}
                  type="button"
                >
                  Niciuna
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
