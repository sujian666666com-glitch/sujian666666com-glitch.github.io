import type { LifeMapMode, LifeNodeData, MapDisplayTier, NodeShellKind } from "@/types/life-map";

export type { MapDisplayTier, NodeShellKind };

const HERO_IDS = new Set(["me", "grandma", "her", "future-me"]);

const YOUTH_MAP_LABELS: Record<string, string> = {
  "youth-meet": "相遇",
  "youth-found": "被发现",
  "youth-apart": "分开",
  "youth-unnamed": "仍在意",
  "youth-first-kiss": "初吻",
  "youth-together": "在一起",
  "youth-breakup": "异地分手",
  "youth-no-contact": "未联系",
  "youth-regret": "长期遗憾"
};

export function getMapLabel(node: LifeNodeData): string {
  return YOUTH_MAP_LABELS[node.id] ?? node.title;
}

export function isHeroNode(node: LifeNodeData): boolean {
  return node.modeRole === "center" || HERO_IDS.has(node.id);
}

export function getNodeDisplayTier(
  node: LifeNodeData,
  mapMode: LifeMapMode,
  highlightedNodeIds: Set<string>,
  selectedNodeId: string | null,
  hasFocus: boolean
): MapDisplayTier {
  if (hasFocus) {
    if (highlightedNodeIds.has(node.id)) {
      if (isHeroNode(node)) return "hero";
      if (selectedNodeId === "her" && node.branchId === "youth-love") return "full";
      return node.type === "person" && (node.importance ?? 0) >= 4 ? "hero" : "full";
    }
    return "ghost";
  }

  if (isHeroNode(node)) return "hero";

  if (mapMode === "route" && node.modeRole === "mainline") return "full";

  if ((node.importance ?? 0) >= 4 && node.modeRole !== "branch") return "full";

  if (node.branchId === "youth-love" && node.type === "side_quest") return "ghost";

  if (node.type === "person" && (node.importance ?? 0) < 4) return "compact";

  if (node.modeRole === "support" || node.modeRole === "context") return "compact";

  if (node.type === "boss" || node.type === "goal" || node.type === "awakening") return "full";

  return "full";
}

export function getNodeShellKind(node: LifeNodeData, tier: MapDisplayTier): NodeShellKind {
  if (tier === "ghost") return "compact-ghost";
  if (node.type === "goal" || node.visualKind === "castle") return "goal-castle";
  if (node.type === "boss" || node.visualKind === "boss") return "boss-flag";
  if (node.branchId === "youth-love" && node.type === "side_quest") return "youth-story";
  if (node.type === "person" || node.type === "family") return "person-sticker";
  return "quest-marker";
}

export interface NodeSizeSpec {
  width: number;
  minHeight?: number;
}

export function resolveNodeSize(node: LifeNodeData, tier: MapDisplayTier): NodeSizeSpec {
  if (tier === "ghost") return { width: 68, minHeight: 68 };
  if (tier === "compact") return { width: 96, minHeight: 96 };
  if (tier === "hero") {
    if (node.type === "goal" || node.visualKind === "castle") return { width: 220, minHeight: 160 };
    return { width: 168, minHeight: 168 };
  }
  if (node.type === "goal" || node.visualKind === "castle") return { width: 180, minHeight: 140 };
  if (node.type === "boss") return { width: 140, minHeight: 120 };
  if (node.branchId === "youth-love") return { width: 112, minHeight: 96 };
  return { width: 136, minHeight: 110 };
}

export function shouldShowSubtitle(node: LifeNodeData, tier: MapDisplayTier): boolean {
  if (tier === "ghost" || tier === "compact") return false;
  if (tier === "hero" && isHeroNode(node)) return Boolean(node.subtitle);
  return false;
}

export function getYouthFocusNodeIds(nodes: LifeNodeData[]): string[] {
  return nodes.filter((node) => node.branchId === "youth-love" || node.id === "her").map((node) => node.id);
}
