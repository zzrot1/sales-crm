import { Building2, ExternalLink } from "lucide-react";

import { SidePanel } from "@/components/side-panel/side-panel";
import type { CompanyListItemDto } from "@/service-api/generated/models";

import styles from "../index.module.css";
import {
  fallback,
  formatItTeam,
  normalizeWebsiteUrl,
} from "../../utils/company-helpers";
import { DetailRow } from "./detail-row";

export function CompanySidePanel({
  company,
  onOpenChange,
}: {
  company: CompanyListItemDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SidePanel
      description={company?.industry ?? undefined}
      onOpenChange={onOpenChange}
      open={Boolean(company)}
      title={company?.name ?? "Companie"}
    >
      {company ? (
        <div className={styles.sidePanelContent}>
          <div className={styles.sidePanelIcon}>
            <Building2 size={20} />
          </div>

          <section className={styles.sidePanelSection}>
            <h3>Contact principal</h3>
            <div className={styles.detailsList}>
              <DetailRow
                label="Nume"
                value={fallback(company.primaryContactName)}
              />
              <DetailRow
                label="Functie"
                value={fallback(company.primaryContactJobTitle)}
              />
              <DetailRow
                label="Email"
                value={fallback(company.primaryContactEmail)}
              />
              <DetailRow
                label="Telefon"
                value={fallback(company.primaryContactPhone)}
              />
            </div>
          </section>

          <section className={styles.sidePanelSection}>
            <h3>Companie</h3>
            <div className={styles.detailsList}>
              <DetailRow label="Industrie" value={fallback(company.industry)} />
              <DetailRow
                label="Echipa IT"
                value={formatItTeam(company.hasItTeam)}
              />
              <DetailRow label="Website" value={fallback(company.website)} />
            </div>
          </section>

          {company.website ? (
            <a
              className={styles.panelLink}
              href={normalizeWebsiteUrl(company.website)}
              rel="noreferrer"
              target="_blank"
            >
              Deschide website <ExternalLink size={15} />
            </a>
          ) : null}

          <section className={styles.sidePanelSection}>
            <h3>Note</h3>
            <p className={styles.panelNotes}>
              {company.notes || "Nu exista note pentru aceasta companie."}
            </p>
          </section>
        </div>
      ) : null}
    </SidePanel>
  );
}
