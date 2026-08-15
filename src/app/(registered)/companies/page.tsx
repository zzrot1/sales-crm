import { Suspense } from "react";

import { CompaniesPage } from "@/features/crm-pages";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CompaniesPage />
    </Suspense>
  );
}
