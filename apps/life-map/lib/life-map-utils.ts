import type { Edge, Node } from "@xyflow/react";
import type { LifeEdgeData, LifeFlowNodeData, LifeMapFilterId, LifeMapPayload, LifeNodeData } from "@/types/life-map";

const filterTagMap: Record<Exclude<LifeMapFilterId, "all">, string[]> = {
  family: ["家庭"],
  study: ["学习"],
  relationship: ["感情"],
  work: ["工作"],
  boss: ["Boss"],
  awakening: ["觉醒点"],
  goal: ["目标", "未来"]
};

const filterTypeMap: Partial<Record<LifeMapFilterId, LifeNodeData["type"][]>> = {
  family: ["family"],
  boss: ["boss"],
  awakening: ["awakening"],
  goal: ["goal"]
};

export function matchNodeFilter(node: LifeNodeData, filter: LifeMapFilterId) {
  if (filter === "all") return true;
  const byType = filterTypeMap[filter]?.includes(node.type) ?? false;
  const tagSet = filterTagMap[filter] ?? [];
  const byTag = node.tags?.some((tag) => tagSet.includes(tag)) ?? false;
  return byType || byTag;
}

export function filterLifeMap(payload: LifeMapPayload, filter: LifeMapFilterId, stageNodeIds: string[] | null) {
  const filteredNodes = payload.nodes.filter((node) => {
    const stageMatched = stageNodeIds ? stageNodeIds.includes(node.id) : true;
    return stageMatched && matchNodeFilter(node, filter);
  });
  const nodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = payload.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return { nodes: filteredNodes, edges: filteredEdges };
}

export function toReactFlowNodes(
  nodes: LifeNodeData[],
  selectedNodeId: string | null,
  isMobile: boolean
): Node<LifeFlowNodeData, "lifeMapNode">[] {
  return nodes.map((node, index) => ({
    id: node.id,
    type: "lifeMapNode",
    position:
      (isMobile ? node.position?.mobile : node.position?.desktop) ??
      { x: isMobile ? (index % 2 === 0 ? 40 : 260) : index * 260, y: isMobile ? index * 180 : 220 },
    data: {
      ...node,
      selected: node.id === selectedNodeId
    } satisfies LifeFlowNodeData
  }));
}

export function toReactFlowEdges(edges: LifeEdgeData[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.relation === "UNLOCKS" || edge.relation === "TRIGGERS",
    type: "smoothstep",
    style: {
      stroke: edge.relation === "CHALLENGES" ? "#ef4444" : edge.relation === "SUPPORTS" ? "#f59e0b" : "#38bdf8",
      strokeDasharray: edge.relation === "AFFECTS" || edge.relation === "SUPPORTS" ? "7 7" : undefined,
      strokeWidth: edge.relation === "UNLOCKS" ? 3 : 2
    },
    labelStyle: { fill: "#cbd5e1", fontWeight: 700 },
    labelBgStyle: { fill: "rgba(15, 23, 42, 0.86)", fillOpacity: 1 }
  }));
}

export function getInitialNodeId(payload: LifeMapPayload | null) {
  return payload?.nodes[0]?.id ?? null;
}
