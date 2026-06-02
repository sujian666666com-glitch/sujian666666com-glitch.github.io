import type { Edge, Node } from "@xyflow/react";
import {
  getMapLabel,
  getNodeDisplayTier,
  getNodeShellKind,
  getYouthFocusNodeIds
} from "@/lib/life-map-display";
import type { LifeEdgeData, LifeFlowNodeData, LifeMapFilterId, LifeMapMode, LifeMapPayload, LifeNodeData } from "@/types/life-map";

const filterTagMap: Record<Exclude<LifeMapFilterId, "all">, string[]> = {
  family: ["家庭", "人物"],
  study: ["学习"],
  youth: ["青春", "支线", "遗憾"],
  work: ["工作"],
  boss: ["Boss"],
  awakening: ["觉醒点"],
  goal: ["目标", "未来"]
};

const filterTypeMap: Partial<Record<LifeMapFilterId, LifeNodeData["type"][]>> = {
  family: ["family", "person"],
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

export function filterLifeMap(
  payload: LifeMapPayload,
  filter: LifeMapFilterId,
  stageNodeIds: string[] | null,
  mapMode: LifeMapMode
) {
  const visibleEdges = payload.edges.filter((edge) => !edge.visibleInModes || edge.visibleInModes.includes(mapMode));
  const connectedInMode = new Set<string>();
  visibleEdges.forEach((edge) => {
    connectedInMode.add(edge.source);
    connectedInMode.add(edge.target);
  });
  const filteredNodes = payload.nodes.filter((node) => {
    const stageMatched = stageNodeIds ? stageNodeIds.includes(node.id) : true;
    const visibleInMode = connectedInMode.has(node.id) || node.modeRole === "center";
    return visibleInMode && stageMatched && matchNodeFilter(node, filter);
  });
  const nodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = visibleEdges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  return { nodes: filteredNodes, edges: filteredEdges };
}

export function getFocusContext(payload: LifeMapPayload, selectedNodeId: string | null) {
  const selectedNode = payload.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const highlightedNodeIds = new Set<string>();
  const highlightedEdgeIds = new Set<string>();
  const youthFocus = selectedNodeId === "her";

  if (!selectedNode || selectedNode.id === "me") {
    return {
      selectedNode,
      highlightedNodeIds,
      highlightedEdgeIds,
      hasFocus: false,
      youthFocus: false,
      focusNodeIds: [] as string[]
    };
  }

  highlightedNodeIds.add(selectedNode.id);

  if (selectedNode.type === "person") {
    payload.nodes.forEach((node) => {
      if (node.relatedPeopleIds?.includes(selectedNode.id)) highlightedNodeIds.add(node.id);
      if (selectedNode.id === "her" && node.branchId === "youth-love") highlightedNodeIds.add(node.id);
    });
  } else if (selectedNode.branchId) {
    payload.nodes.forEach((node) => {
      if (node.branchId === selectedNode.branchId) highlightedNodeIds.add(node.id);
      if (node.id === "her") highlightedNodeIds.add(node.id);
    });
  } else {
    selectedNode.relatedPeopleIds?.forEach((id) => highlightedNodeIds.add(id));
  }

  payload.edges.forEach((edge) => {
    const branchMatched = selectedNode.branchId && edge.lineStyle === "youth-branch";
    const selectedPersonMatched =
      selectedNode.type === "person" &&
      (edge.source === selectedNode.id ||
        edge.target === selectedNode.id ||
        (selectedNode.id === "her" && edge.lineStyle === "youth-branch"));
    const selectedNodeMatched = edge.source === selectedNode.id || edge.target === selectedNode.id;
    const bothEndpointsMatched = highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target);

    if (branchMatched || selectedPersonMatched || selectedNodeMatched || bothEndpointsMatched) {
      highlightedEdgeIds.add(edge.id);
      highlightedNodeIds.add(edge.source);
      highlightedNodeIds.add(edge.target);
    }
  });

  const focusNodeIds = youthFocus ? getYouthFocusNodeIds(payload.nodes) : [];

  return {
    selectedNode,
    highlightedNodeIds,
    highlightedEdgeIds,
    hasFocus: true,
    youthFocus,
    focusNodeIds
  };
}

export function toReactFlowNodes(
  nodes: LifeNodeData[],
  selectedNodeId: string | null,
  isMobile: boolean,
  mapMode: LifeMapMode,
  highlightedNodeIds: Set<string>,
  hasFocus: boolean
): Node<LifeFlowNodeData, "lifeMapNode">[] {
  return nodes.map((node, index) => {
    const displayTier = getNodeDisplayTier(node, mapMode, highlightedNodeIds, selectedNodeId, hasFocus);
    const shellKind = getNodeShellKind(node, displayTier);

    return {
      id: node.id,
      type: "lifeMapNode",
      ariaLabel: getMapLabel(node),
      position:
        (isMobile ? node.modePosition?.[mapMode]?.mobile : node.modePosition?.[mapMode]?.desktop) ??
        (isMobile ? node.position?.mobile : node.position?.desktop) ??
        { x: isMobile ? (index % 2 === 0 ? 40 : 280) : index * 320, y: isMobile ? index * 280 : 280 },
      data: {
        ...node,
        selected: node.id === selectedNodeId,
        highlighted: highlightedNodeIds.has(node.id),
        dimmed: hasFocus && !highlightedNodeIds.has(node.id),
        mapMode,
        displayTier,
        mapLabel: getMapLabel(node),
        shellKind
      } satisfies LifeFlowNodeData
    };
  });
}

export function toReactFlowEdges(
  edges: LifeEdgeData[],
  highlightedEdgeIds: Set<string>,
  hasFocus: boolean,
  youthFocus = false
): Edge[] {
  return edges.map((edge) => {
    const highlighted = highlightedEdgeIds.has(edge.id);
    const isYouthEdge = edge.lineStyle === "youth-branch";
    const ghostEdge = hasFocus && !highlighted;

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: ghostEdge ? undefined : (edge.relationLabel ?? edge.label),
      animated: (youthFocus && isYouthEdge && highlighted) || (!hasFocus && (edge.relation === "UNLOCKS" || edge.relation === "TRIGGERS")),
      type: "bezier",
      style: {
        stroke: getEdgeColor(edge),
        strokeDasharray: getEdgeDash(edge),
        strokeWidth: getEdgeWidth(edge, highlighted, hasFocus),
        opacity: ghostEdge ? (isYouthEdge ? 0.08 : 0.12) : 0.92,
        filter: highlighted ? "drop-shadow(0 3px 0 rgba(255, 249, 236, 0.75))" : undefined
      },
      labelStyle: {
        fill: ghostEdge ? "#7A6A58" : "#332A22",
        fontWeight: 800,
        opacity: ghostEdge ? 0.15 : 0.9
      },
      labelBgStyle: { fill: "#FFF9EC", fillOpacity: ghostEdge ? 0.15 : 0.88 }
    };
  });
}

export function getInitialNodeId(payload: LifeMapPayload | null) {
  return payload?.nodes.find((node) => node.id === "me")?.id ?? payload?.nodes[0]?.id ?? null;
}

function getEdgeColor(edge: LifeEdgeData) {
  if (edge.lineStyle === "youth-branch") return "#8B6F9A";
  if (edge.lineStyle === "boss-pressure") return "#9A4A3F";
  if (edge.lineStyle === "person-link") return "#D8C5A8";
  if (edge.lineStyle === "branch") return "#B48A9F";
  return "#B76E3C";
}

function getEdgeDash(edge: LifeEdgeData) {
  if (edge.lineStyle === "main-route") return "12 10";
  if (edge.lineStyle === "youth-branch") return "8 7";
  if (edge.lineStyle === "boss-pressure") return "4 5";
  if (edge.lineStyle === "branch") return "7 8";
  return "3 8";
}

function getEdgeWidth(edge: LifeEdgeData, highlighted: boolean, hasFocus: boolean) {
  const base = edge.lineStyle === "youth-branch" ? 3.2 : edge.lineStyle === "main-route" ? 3 : 1.7;
  if (highlighted) return base + 1.3;
  if (hasFocus) return Math.max(1, base - 0.7);
  return base;
}
