import { notFound } from "next/navigation";
import { CampaignProvider } from "@/components/campaign/CampaignContext";
import { CampaignShell } from "@/components/campaign/CampaignShell";

export default async function CampaignLayout(props: LayoutProps<"/campaigns/[campaignId]">) {
  const { campaignId } = await props.params;
  const id = Number(campaignId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  return (
    <CampaignProvider campaignId={id}>
      <CampaignShell>{props.children}</CampaignShell>
    </CampaignProvider>
  );
}
