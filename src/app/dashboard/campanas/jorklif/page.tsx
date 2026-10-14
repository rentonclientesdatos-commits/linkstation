import { Suspense } from "react";
import { getJorklifCampaignDataAction } from "@/lib/actions/jorklif-campaign";
import { JorklifCampaignView } from "@/components/campanas/jorklif/JorklifCampaignView";

export const dynamic = "force-dynamic";

export default async function JorklifCampaignPage() {
  const result = await getJorklifCampaignDataAction();

  return (
    <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-3xl bg-muted/20" />}>
      <JorklifCampaignView
        initialLeads={result.leads}
        initialStats={result.stats}
      />
    </Suspense>
  );
}
