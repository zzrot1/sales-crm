import { DealDetailPage } from "@/features/crm-pages/components/deals/deal-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DealDetailPage dealId={id} />;
}
