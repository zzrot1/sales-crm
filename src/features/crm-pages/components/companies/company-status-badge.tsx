import type { CompanyDtoStatus } from "@/service-api/generated/models";

import styles from "../index.module.css";
import {
  companyStatusLabels,
  companyStatusTones,
} from "../../utils/company-helpers";

export function CompanyStatusBadge({ status }: { status: CompanyDtoStatus }) {
  return (
    <span className={`${styles.status} ${styles[companyStatusTones[status]]}`}>
      {companyStatusLabels[status]}
    </span>
  );
}
