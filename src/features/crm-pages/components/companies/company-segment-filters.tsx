import type { CompanySegments } from "../../hooks/use-company-segments";
import { calledFilters, companySizeFilters } from "../../utils/intelligence-helpers";
import styles from "../index.module.css";
import { CuiDiscoveryControl } from "./cui-discovery-control";

/** Segmentele de deasupra tabelului de companii: marime si sunate / nesunate. */
export function CompanySegmentFilters({ segments }: { segments: CompanySegments }) {
  return (
    <div className={styles.segmentBar}>
      <div aria-label="Marimea companiei" className={styles.segmented} role="group">
        {companySizeFilters.map((option) => (
          <button
            aria-pressed={segments.size === option.id}
            className={segments.size === option.id ? styles.segmentActive : undefined}
            key={option.id}
            onClick={() => segments.setSize(option.id)}
            type="button"
          >
            {option.label}
            {option.id === "unknown" && segments.withoutDataCount ? (
              <span className={styles.segmentCount}>{segments.withoutDataCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div aria-label="Sunate sau nesunate" className={styles.segmented} role="group">
        {calledFilters.map((option) => (
          <button
            aria-pressed={segments.called === option.id}
            className={segments.called === option.id ? styles.segmentActive : undefined}
            key={option.id}
            onClick={() => segments.setCalled(option.id)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <CuiDiscoveryControl
        discovery={segments.discovery}
        withoutDataCount={segments.withoutDataCount}
      />
    </div>
  );
}
