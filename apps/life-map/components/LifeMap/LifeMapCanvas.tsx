"use client";

import {
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow
} from "@xyflow/react";
import { useEffect, useMemo } from "react";
import { LifeMapNode } from "@/components/LifeMap/LifeMapNode";
import { filterLifeMap, getFocusContext, toReactFlowEdges, toReactFlowNodes } from "@/lib/life-map-utils";
import { useLifeMapStore } from "@/lib/life-map-store";
import type { LifeMapPayload } from "@/types/life-map";

const nodeTypes = {
  lifeMapNode: LifeMapNode
};

export function LifeMapCanvas({ payload, isMobile }: { payload: LifeMapPayload; isMobile: boolean }) {
  return (
    <ReactFlowProvider>
      <LifeMapCanvasInner payload={payload} isMobile={isMobile} />
    </ReactFlowProvider>
  );
}

function LifeMapCanvasInner({ payload, isMobile }: { payload: LifeMapPayload; isMobile: boolean }) {
  const mapMode = useLifeMapStore((state) => state.mapMode);
  const selectedNodeId = useLifeMapStore((state) => state.selectedNodeId);
  const selectedFilter = useLifeMapStore((state) => state.selectedFilter);
  const selectedStageId = useLifeMapStore((state) => state.selectedStageId);
  const setFilter = useLifeMapStore((state) => state.setFilter);
  const setSelectedNode = useLifeMapStore((state) => state.setSelectedNode);
  const { fitView } = useReactFlow();

  const selectedStage = payload.stages.find((stage) => stage.id === selectedStageId) ?? null;
  const stageNodeIds = selectedStage ? selectedStage.nodeIds : null;
  const focusContext = useMemo(() => getFocusContext(payload, selectedNodeId), [payload, selectedNodeId]);
  const filtered = useMemo(
    () => filterLifeMap(payload, selectedFilter, stageNodeIds, mapMode),
    [payload, selectedFilter, stageNodeIds, mapMode]
  );
  const nodes = useMemo(
    () =>
      toReactFlowNodes(
        filtered.nodes,
        selectedNodeId,
        isMobile,
        mapMode,
        focusContext.highlightedNodeIds,
        focusContext.hasFocus
      ),
    [filtered.nodes, selectedNodeId, isMobile, mapMode, focusContext]
  );
  const edges = useMemo(
    () => toReactFlowEdges(filtered.edges, focusContext.highlightedEdgeIds, focusContext.hasFocus),
    [filtered.edges, focusContext]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fitView({ padding: isMobile ? 0.18 : 0.12, duration: 450 });
    }, 90);
    return () => window.clearTimeout(timeout);
  }, [fitView, isMobile, nodes.length, mapMode, selectedFilter, selectedStageId]);

  useEffect(() => {
    if (selectedNodeId && !filtered.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNode(filtered.nodes[0]?.id ?? null);
    }
  }, [filtered.nodes, selectedNodeId, setSelectedNode]);

  return (
    <div id="life-map-export-surface" className="life-map-paper-surface relative h-[640px] overflow-hidden rounded-[8px] border border-[#D8C5A8] bg-[#F7F1E5] shadow-[0_24px_60px_rgba(83,59,33,0.18)] md:h-[720px]">
      <div className="paper-grain pointer-events-none absolute inset-0 z-0" />
      <div className="pointer-events-none absolute left-8 top-8 z-0 h-16 w-28 rounded-[50%] border-2 border-[#7B9B6F]/45 bg-[#7B9B6F]/10" />
      <div className="pointer-events-none absolute bottom-10 right-12 z-0 h-20 w-36 rounded-t-full border-2 border-[#B76E3C]/25 bg-[#D6A84F]/10" />
      <div className="pointer-events-none absolute right-32 top-16 z-0 text-5xl font-black text-[#D8C5A8]/45">☁</div>
      <div className="pointer-events-none absolute bottom-20 left-16 z-0 text-4xl text-[#7B9B6F]/50">♧</div>
      {nodes.length === 0 ? (
        <div className="relative z-10 grid h-full place-items-center p-8 text-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#7A6A58]">Empty Page</p>
            <h3 className="mt-3 text-2xl font-black text-[#332A22]">没有匹配的节点</h3>
            <p className="mt-2 text-sm text-[#7A6A58]">请切回“全部”，或选择其它章节继续查看。</p>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: isMobile ? 0.18 : 0.12 }}
          minZoom={isMobile ? 0.12 : 0.24}
          maxZoom={1.35}
          nodesDraggable={false}
          onNodeClick={(_, node) => {
            setFilter("all");
            setSelectedNode(node.id);
          }}
          proOptions={{ hideAttribution: true }}
          className="relative z-10"
        >
          <Controls className="no-map-export" position={isMobile ? "bottom-left" : "bottom-right"} />
        </ReactFlow>
      )}
    </div>
  );
}
