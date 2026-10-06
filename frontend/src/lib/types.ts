export type CampaignRole = "OWNER" | "MASTER" | "PLAYER";
export type MarkerShape = "CIRCLE" | "SQUARE" | "DIAMOND" | "TRIANGLE" | "HEXAGON" | "STAR" | "PIN" | "SHIELD";
export type MarkerVisibility = "VISIBLE" | "HIDDEN";

export interface Me {
  id: number;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  myRole: CampaignRole;
  inviteCode: string | null;
  memberCount: number;
  createdAt: string;
}

export interface Member {
  id: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  role: CampaignRole;
  joinedAt: string;
}

export interface GameMap {
  id: number;
  campaignId: number;
  name: string;
  description: string | null;
  width: number;
  height: number;
  imageUrl: string;
  markerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarkerType {
  id: number;
  name: string;
  shape: MarkerShape;
  color: string;
  icon: string | null;
  sortOrder: number;
  builtIn: boolean;
}

export interface Marker {
  id: number;
  mapId: number;
  typeId: number;
  title: string;
  description: string | null;
  gmNotes: string | null;
  x: number;
  y: number;
  visibility: MarkerVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface MarkerInput {
  typeId: number;
  title: string;
  description?: string | null;
  gmNotes?: string | null;
  x: number;
  y: number;
  visibility: MarkerVisibility;
}

export interface MarkerNote {
  id: number;
  markerId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterSummary {
  id: number;
  name: string;
  ownerId: number;
  ownerName: string;
  metatype: string | null;
  role: string | null;
  mine: boolean;
  updatedAt: string;
}

export interface CharacterDetail<S = Record<string, unknown>> {
  id: number;
  campaignId: number;
  name: string;
  ownerId: number;
  ownerName: string;
  editable: boolean;
  sheet: S;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterNote {
  id: number;
  characterId: number;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionLog {
  id: number;
  campaignId: number;
  sessionNumber: number | null;
  title: string;
  playedOn: string | null;
  summary: string | null;
  content: string | null;
  published: boolean;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_LABELS: Record<CampaignRole, string> = {
  OWNER: "Владелец",
  MASTER: "Мастер",
  PLAYER: "Игрок",
};

export function canManageWorld(role: CampaignRole | undefined): boolean {
  return role === "OWNER" || role === "MASTER";
}
