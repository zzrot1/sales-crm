"use client";

import { LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

import {
  useGetCompanyIntelligence,
  useGetCuiCandidates,
  useRefreshCompanyIntelligence,
} from "@/service-api/generated/endpoints/companies/companies";
import type { CompanyRegistryDto } from "@/service-api/generated/models";

import styles from "../index.module.css";
import { fallback } from "../../utils/company-helpers";
import {
  formatCount,
  formatDate,
  formatLei,
  getGrowth,
  suggestOffer,
  type Growth,
} from "../../utils/intelligence-helpers";
import { DetailRow } from "./detail-row";

function formatActivity(registry: CompanyRegistryDto) {
  return [registry.caenCode, registry.caenName].filter(Boolean).join(" - ") || "-";
}

function formatFounded(registeredAt: string | null) {
  if (!registeredAt) return "-";

  const year = Number(registeredAt.slice(0, 4));
  const age = new Date().getFullYear() - year;

  return `${year} (${age} ${age === 1 ? "an" : "ani"})`;
}

function formatVat(isVatPayer: boolean | null) {
  if (isVatPayer === null) return "-";
  return isVatPayer ? "Da" : "Nu";
}

function GrowthNote({ growth }: { growth: Growth | null }) {
  if (!growth) return null;

  return (
    <small className={styles[`growth-${growth.direction}`]}>
      {growth.label} fata de anul anterior
    </small>
  );
}

/**
 * Datele oficiale ale firmei, aduse de la ANAF dupa CUI: stare, activitate si
 * ultimii ani de bilant. Tot de aici se seteaza CUI-ul. Dreptul de scriere il
 * verifica serverul; un refuz apare ca toast, ca orice alta eroare.
 */
export function CompanyIntelligenceSection({
  companyId,
  hasItTeam,
  website,
}: {
  companyId: string;
  hasItTeam: boolean | null;
  website: string | null;
}) {
  const [cuiDraft, setCuiDraft] = useState("");
  const [isEditingCui, setIsEditingCui] = useState(false);
  const [isSearchingSite, setIsSearchingSite] = useState(false);

  const intelligenceQuery = useGetCompanyIntelligence(companyId);
  // Citeste site-ul firmei doar la cerere: dureaza cateva secunde.
  const candidatesQuery = useGetCuiCandidates(companyId, {
    query: { enabled: isSearchingSite, staleTime: Number.POSITIVE_INFINITY },
  });
  // Raspunsul nu e o inregistrare cu `id`, deci politica implicita re-cere
  // resursa "companies": si panoul acesta, si tabelul (angajati, cifra de afaceri).
  const refreshMutation = useRefreshCompanyIntelligence({
    mutation: {
      meta: { successMessage: "Datele ANAF au fost actualizate." },
      onSuccess: () => {
        setCuiDraft("");
        setIsEditingCui(false);
        setIsSearchingSite(false);
      },
    },
  });

  const registry = intelligenceQuery.data?.registry ?? null;
  // Cel mai nou an primul: e cel despre care vorbesti la telefon.
  const years = [...(intelligenceQuery.data?.financials ?? [])].reverse();
  const [latest, previous] = years;
  const isRefreshing = refreshMutation.isPending;
  const showCuiForm = !registry || isEditingCui;
  const suggestion = latest
    ? suggestOffer({
        caenCode: registry?.caenCode ?? null,
        employees: latest.employees,
        hasItTeam,
      })
    : null;

  const submitCui = () => {
    const cui = cuiDraft.trim();

    if (cui) {
      refreshMutation.mutate({ companyId, data: { cui } });
    }
  };

  if (intelligenceQuery.isPending) {
    return (
      <section className={styles.sidePanelSection}>
        <h3>Date ANAF</h3>
        <p className={styles.muted}>Se incarca...</p>
      </section>
    );
  }

  if (intelligenceQuery.isError) {
    return (
      <section className={styles.sidePanelSection}>
        <h3>Date ANAF</h3>
        <p className={styles.formError} role="alert">
          Nu am putut incarca datele ANAF.
        </p>
      </section>
    );
  }

  return (
    <>
      {suggestion ? (
        <section className={styles.offerCard}>
          <span>Ce le propun la telefon</span>
          <strong>{suggestion.offer}</strong>
          <p>{suggestion.reason}</p>
        </section>
      ) : null}

      <section className={styles.sidePanelSection}>
        <div className={styles.intelHeader}>
          <h3>Date ANAF</h3>
          {registry && !isEditingCui ? (
            <button
              className={styles.ghostButton}
              disabled={isRefreshing}
              onClick={() => refreshMutation.mutate({ companyId, data: {} })}
              type="button"
            >
              {isRefreshing ? (
                <LoaderCircle className={styles.spinner} size={15} />
              ) : (
                <RefreshCw size={15} />
              )}
              Actualizeaza
            </button>
          ) : null}
        </div>

        {latest ? (
          <div className={styles.intelStats}>
            <div>
              <span>Cifra de afaceri {latest.year}</span>
              <strong>{formatLei(latest.turnover)}</strong>
              <GrowthNote growth={getGrowth(latest.turnover, previous?.turnover)} />
            </div>
            <div>
              <span>Profit net</span>
              <strong
                className={
                  latest.netProfit !== null && latest.netProfit < 0
                    ? styles["growth-down"]
                    : undefined
                }
              >
                {formatLei(latest.netProfit)}
              </strong>
            </div>
            <div>
              <span>Angajati</span>
              <strong>{formatCount(latest.employees)}</strong>
              <GrowthNote growth={getGrowth(latest.employees, previous?.employees)} />
            </div>
          </div>
        ) : null}

        {registry ? (
          <>
            {registry.isInactive ? (
              <p className={styles.formError} role="alert">
                Firma este declarata inactiva fiscal la ANAF.
              </p>
            ) : null}

            <div className={styles.detailsList}>
              <DetailRow label="CUI" value={registry.cui} />
              <DetailRow label="Denumire legala" value={fallback(registry.legalName)} />
              <DetailRow label="Activitate (CAEN)" value={formatActivity(registry)} />
              <DetailRow label="Infiintata" value={formatFounded(registry.registeredAt)} />
              <DetailRow label="Stare" value={fallback(registry.registrationStatus)} />
              <DetailRow label="Forma juridica" value={fallback(registry.legalForm)} />
              <DetailRow label="Judet" value={fallback(registry.county)} />
              <DetailRow label="Platitor de TVA" value={formatVat(registry.isVatPayer)} />
            </div>

            {years.length ? (
              <table className={styles.intelTable}>
                <thead>
                  <tr>
                    <th scope="col">An</th>
                    <th scope="col">Cifra de afaceri</th>
                    <th scope="col">Profit net</th>
                    <th scope="col">Angajati</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((year) => (
                    <tr key={year.year}>
                      <th scope="row">{year.year}</th>
                      <td>{formatLei(year.turnover)}</td>
                      <td
                        className={
                          year.netProfit !== null && year.netProfit < 0
                            ? styles["growth-down"]
                            : undefined
                        }
                      >
                        {formatLei(year.netProfit)}
                      </td>
                      <td>{formatCount(year.employees)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.muted}>
                ANAF nu are bilanturi publicate pentru aceasta firma in ultimii 5 ani.
              </p>
            )}

            <p className={styles.muted}>
              Actualizat la {formatDate(registry.syncedAt)}.{" "}
              {!isEditingCui ? (
                <button
                  className={styles.linkButton}
                  onClick={() => setIsEditingCui(true)}
                  type="button"
                >
                  Schimba CUI-ul
                </button>
              ) : null}
            </p>
          </>
        ) : (
          <p className={styles.muted}>
            Adauga CUI-ul firmei ca sa aduci de la ANAF cifra de afaceri, profitul si
            numarul de angajati.
          </p>
        )}

        {showCuiForm && website ? (
          isSearchingSite ? (
            <div className={styles.siteCandidates}>
              {candidatesQuery.isFetching ? (
                <p className={styles.muted}>
                  <LoaderCircle className={styles.spinner} size={14} /> Citesc site-ul si
                  verific la ANAF...
                </p>
              ) : candidatesQuery.isError ? (
                <p className={styles.formError}>Nu am putut citi site-ul firmei.</p>
              ) : candidatesQuery.data?.length ? (
                <>
                  <p className={styles.muted}>Am gasit pe site:</p>
                  {candidatesQuery.data.map((candidate) => (
                    <button
                      className={styles.secondaryButton}
                      disabled={isRefreshing}
                      key={candidate.cui}
                      onClick={() =>
                        refreshMutation.mutate({ companyId, data: { cui: candidate.cui } })
                      }
                      type="button"
                    >
                      {candidate.legalName ?? "Firma necunoscuta"} · CUI {candidate.cui}
                      {candidate.matchesName ? " (se potriveste)" : ""}
                    </button>
                  ))}
                </>
              ) : (
                <p className={styles.muted}>
                  Nu am gasit niciun CUI pe site. Cauta firma pe mfinante.gov.ro sau
                  listafirme.ro si introdu-l mai jos.
                </p>
              )}
            </div>
          ) : (
            <button
              className={styles.secondaryButton}
              onClick={() => setIsSearchingSite(true)}
              type="button"
            >
              <Search size={15} /> Cauta CUI-ul pe site-ul lor
            </button>
          )
        ) : null}

        {showCuiForm ? (
          <form
            className={styles.intelForm}
            onSubmit={(event) => {
              event.preventDefault();
              submitCui();
            }}
          >
            <label className={styles.dialogField}>
              <span>CUI</span>
              <input
                disabled={isRefreshing}
                inputMode="numeric"
                onChange={(event) => setCuiDraft(event.target.value)}
                placeholder="ex. 14399840"
                value={cuiDraft}
              />
            </label>
            <button
              className={styles.button}
              disabled={isRefreshing || !cuiDraft.trim()}
              type="submit"
            >
              {isRefreshing ? <LoaderCircle className={styles.spinner} size={16} /> : null}
              {isRefreshing ? "Se aduc datele..." : "Adu datele"}
            </button>
            {isEditingCui ? (
              <button
                className={styles.ghostButton}
                disabled={isRefreshing}
                onClick={() => setIsEditingCui(false)}
                type="button"
              >
                Renunta
              </button>
            ) : null}
          </form>
        ) : null}
      </section>
    </>
  );
}
