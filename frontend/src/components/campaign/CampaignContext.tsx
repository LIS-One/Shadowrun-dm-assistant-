"use client";

import { createContext, useContext } from "react";
import useSWR, { type KeyedMutator } from "swr";
import { fetcher } from "@/lib/api";
import { canManageWorld, type Campaign } from "@/lib/types";

interface CampaignContextValue {
  campaignId: number;
  campaign: Campaign | undefined;
  isMaster: boolean;
  isOwner: boolean;
  error: unknown;
  mutate: KeyedMutator<Campaign>;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ campaignId, children }: { campaignId: number; children: React.ReactNode }) {
  const { data, error, mutate } = useSWR<Campaign>(`/campaigns/${campaignId}`, fetcher);
  return (
    <CampaignContext.Provider
      value={{
        campaignId,
        campaign: data,
        isMaster: canManageWorld(data?.myRole),
        isOwner: data?.myRole === "OWNER",
        error,
        mutate,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaign must be used inside CampaignProvider");
  return ctx;
}
