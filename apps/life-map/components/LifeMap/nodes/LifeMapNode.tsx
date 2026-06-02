"use client";

import type { Node, NodeProps } from "@xyflow/react";
import type { LifeFlowNodeData } from "@/types/life-map";
import type { NodeShellKind } from "@/lib/life-map-display";
import { BossFlagNode } from "./BossFlagNode";
import { CompactGhostNode } from "./CompactGhostNode";
import { GoalCastleNode } from "./GoalCastleNode";
import { PersonStickerNode } from "./PersonStickerNode";
import { QuestMarkerNode } from "./QuestMarkerNode";
import { YouthStoryNode } from "./YouthStoryNode";

type LifeMapNodeProps = NodeProps<Node<LifeFlowNodeData, "lifeMapNode">>;

export function LifeMapNode({ data }: LifeMapNodeProps) {
  const shellKind = data.shellKind as NodeShellKind;

  switch (shellKind) {
    case "compact-ghost":
      return <CompactGhostNode data={data} />;
    case "person-sticker":
      return <PersonStickerNode data={data} />;
    case "youth-story":
      return <YouthStoryNode data={data} />;
    case "boss-flag":
      return <BossFlagNode data={data} />;
    case "goal-castle":
      return <GoalCastleNode data={data} />;
    case "quest-marker":
    default:
      return <QuestMarkerNode data={data} />;
  }
}
