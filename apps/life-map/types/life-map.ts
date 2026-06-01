export type LifeNodeType =
  | "origin"
  | "person"
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
export type LifeMapMode = "relationship" | "route";
export type LifeNodeModeRole = "center" | "person" | "mainline" | "branch" | "support" | "context";
export type LifeBranchWeight = "normal" | "important";
export type LifeEdgeLineStyle = "main-route" | "person-link" | "youth-branch" | "branch" | "boss-pressure";
export type LifeVisualKind =
  | "avatar"
  | "self"
  | "guardian"
  | "signpost"
  | "cottage"
  | "boss"
  | "campfire"
  | "treasure"
  | "quest-board"
  | "branch-path"
  | "castle"
  | "teacher"
  | "future";

export interface LifeNodeStoryBeat {
  label: string;
  value: string;
}

export interface LifeNodeDefeatBy {
  weakness: string;
  cost: string;
  method: string;
  status: string;
}

export interface LifeNodePositionSet {
  desktop: { x: number; y: number };
  mobile: { x: number; y: number };
}

export interface LifeNodeData {
  id: string;
  type: LifeNodeType;
  title: string;
  subtitle?: string;
  period?: string;
  location?: string;
  summary: string;
  impact?: string;
  relationship?: string;
  emotion?: string;
  gain?: string;
  loss?: string;
  nextStep?: string;
  exp?: number;
  unlockedSkills?: string[];
  tags?: string[];
  importance?: 1 | 2 | 3 | 4 | 5;
  status?: LifeNodeStatus;
  modeRole?: LifeNodeModeRole;
  visualKind?: LifeVisualKind;
  chapter?: string;
  relatedPeopleIds?: string[];
  storyBeats?: LifeNodeStoryBeat[];
  defeatBy?: LifeNodeDefeatBy;
  branchId?: string;
  branchLabel?: string;
  branchWeight?: LifeBranchWeight;
  position?: LifeNodePositionSet;
  modePosition?: Partial<Record<LifeMapMode, LifeNodePositionSet>>;
}

export interface LifeEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  relation: "LEADS_TO" | "AFFECTS" | "TRIGGERS" | "UNLOCKS" | "CHALLENGES" | "SUPPORTS";
  relationLabel?: string;
  lineStyle?: LifeEdgeLineStyle;
  strength?: 1 | 2 | 3 | 4 | 5;
  visibleInModes?: LifeMapMode[];
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
  dimmed: boolean;
  highlighted: boolean;
  mapMode: LifeMapMode;
} & Record<string, unknown>;

export type LifeMapFilterId =
  | "all"
  | "family"
  | "study"
  | "youth"
  | "work"
  | "boss"
  | "awakening"
  | "goal";

export interface LifeMapFilter {
  id: LifeMapFilterId;
  label: string;
}
