"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow
} from "@xyflow/react";
import { useEffect, useMemo } from "react";
import { LifeMapNode } from "@/components/LifeMap/LifeMapNode";
import { filterLifeMap, toReactFlowEdges, toReactFlowNodes } from "@/lib/life-map-utils";
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
  const selectedNodeId = useLifeMapStore((state) => state.selectedNodeId);
  const selectedFilter = useLifeMapStore((state) => state.selectedFilter);
  const selectedStageId = useLifeMapStore((state) => state.selectedStageId);
  const setSelectedNode = useLifeMapStore((state) => state.setSelectedNode);
  const { fitView } = useReactFlow();

  const selectedStage = payload.stages.find((stage) => stage.id === selectedStageId) ?? null;
  const stageNodeIds = selectedStage ? selectedStage.nodeIds : null;
  const filtered = useMemo(
    () => filterLifeMap(payload, selectedFilter, stageNodeIds),
    [payload, selectedFilter, stageNodeIds]
  );
  const nodes = useMemo(
    () => toReactFlowNodes(filtered.nodes, selectedNodeId, isMobile),
    [filtered.nodes, selectedNodeId, isMobile]
  );
  const edges = useMemo(() => toReactFlowEdges(filtered.edges), [filtered.edges]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      fitView({ padding: isMobile ? 0.18 : 0.12, duration: 450 });
    }, 90);
    return () => window.clearTimeout(timeout);
  }, [fitView, isMobile, nodes.length]);

  useEffect(() => {
    if (selectedNodeId && !filtered.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNode(filtered.nodes[0]?.id ?? null);
    }
  }, [filtered.nodes, selectedNodeId, setSelectedNode]);

  return (
    <div id="life-map-export-surface" className="relative h-[620px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-950 shadow-panel md:h-[680px]">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_22%_16%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_80%_72%,rgba(245,158,11,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-30 [background-image:radial-gradient(circle,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:28px_28px]" />
      {nodes.length === 0 ? (
        <div className="relative z-10 grid h-full place-items-center p-8 text-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Empty Route</p>
            <h3 className="mt-3 text-2xl font-black text-white">没有匹配的节点</h3>
            <p className="mt-2 text-sm text-slate-400">请切回“全部”，或选择其它阶段继续查看。</p>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: isMobile ? 0.18 : 0.12 }}
          minZoom={0.28}
          maxZoom={1.35}
          nodesDraggable={false}
          onNodeClick={(_, node) => setSelectedNode(node.id)}
          proOptions={{ hideAttribution: true }}
          className="relative z-10"
        >
          <Background color="rgba(148, 163, 184, 0.18)" gap={28} variant={BackgroundVariant.Dots} />
          <Controls position={isMobile ? "bottom-left" : "bottom-right"} />
          {!isMobile ? <MiniMap position="bottom-left" nodeColor="#22d3ee" maskColor="rgba(2, 6, 23, 0.72)" pannable zoomable /> : null}
        </ReactFlow>
      )}
    </div>
  );
}
