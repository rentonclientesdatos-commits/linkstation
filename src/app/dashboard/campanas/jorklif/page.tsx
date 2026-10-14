import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getActiveTenantConfig } from "@/lib/actions/tenant";
import { getJorklifCampaignDataAction } from "@/lib/actions/jorklif-campaign";
import { JorklifCampaignView } from "@/components/campanas/jorklif/JorklifCampaignView";

export const dynamic = "force-dynamic";

export default async function JorklifCampaignPage() {
  const tenant = await getActiveTenantConfig();
  const name = (tenant?.name || "").toLowerCase().trim();
  const id = (tenant?.id || "").toLowerCase().trim();
  const isJorklif = name.includes("jorklif") || id === "45f45121-4ed4-48f1-bd13-816df3755188";

  if (!isJorklif) {
    redirect("/dashboard/campanas");
  }

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
