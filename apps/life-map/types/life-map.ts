export type LifeNodeType =
  | "origin"
  | "family"
  | "stage"
  | "event"
  | "quest"
  | "side_quest"
  | "boss"
  | "awakening"
  | "reward"
  | "goal";

export type LifeNodeStatus = "completed" | "current" | "future" | "locked";

export interface LifeNodeData {
  id: string;
  type: LifeNodeType;
  title: string;
  subtitle?: string;
  period?: string;
  location?: string;
  summary: string;
  impact?: string;
  exp?: number;
  unlockedSkills?: string[];
  tags?: string[];
  importance?: 1 | 2 | 3 | 4 | 5;
  status?: LifeNodeStatus;
  position?: {
    desktop: { x: number; y: number };
    mobile: { x: number; y: number };
  };
}

export interface LifeEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  relation: "LEADS_TO" | "AFFECTS" | "TRIGGERS" | "UNLOCKS" | "CHALLENGES" | "SUPPORTS";
}

export interface LifeMapPayload {
  nodes: LifeNodeData[];
  edges: LifeEdgeData[];
  stages: LifeStage[];
}

export interface LifeStage {
  id: string;
  label: string;
  nodeIds: string[];
}

export type LifeFlowNodeData = LifeNodeData & {
  selected: boolean;
} & Record<string, unknown>;

export type LifeMapFilterId =
  | "all"
  | "family"
  | "study"
  | "relationship"
  | "work"
  | "boss"
  | "awakening"
  | "goal";

export interface LifeMapFilter {
  id: LifeMapFilterId;
  label: string;
}
