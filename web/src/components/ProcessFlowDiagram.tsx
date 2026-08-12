import { useMemo } from "react";
import { ReactFlow, Background, Controls, Handle, Position } from "@xyflow/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { computeFlowLayout } from "../lib/flowLayout";
import type { LayoutNode } from "../lib/flowLayout";
import type { ProcessStep } from "../types/domain";

interface ViewNodeData {
  label: string;
  mainIndex: number;
  kind: LayoutNode["kind"];
  isDecision: boolean;
  [key: string]: unknown;
}

function ViewStepNode({ data }: NodeProps) {
  const d = data as ViewNodeData;

  if (d.kind === "branchHeader") {
    return (
      <div className="flow-branch-header flow-branch-header--view">
        <Handle type="target" position={Position.Top} />
        <span className="flow-branch-header-label">{d.label || "Untitled branch"}</span>
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }

  return (
    <div className="flow-view-node">
      <Handle type="target" position={Position.Top} />
      {d.kind === "main" && <div className="flow-step-number">{d.mainIndex + 1}</div>}
      <span className="flow-view-label">{d.label || "Untitled step"}</span>
      {d.isDecision && <span className="flow-decision-badge">Decision</span>}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { viewStep: ViewStepNode };

interface Props {
  steps: ProcessStep[];
}

export default function ProcessFlowDiagram({ steps }: Props) {
  const layout = useMemo(() => computeFlowLayout(steps), [steps]);

  const nodes: Node[] = useMemo(
    () =>
      layout.nodes.map((n) => ({
        id: n.id,
        type: "viewStep",
        position: { x: n.x, y: n.y },
        data: { label: n.label, mainIndex: n.mainIndex, kind: n.kind, isDecision: n.isDecision } satisfies ViewNodeData,
        draggable: false,
        selectable: false,
      })),
    [layout]
  );

  const edges: Edge[] = useMemo(
    () => layout.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: "smoothstep" })),
    [layout]
  );

  if (steps.length === 0) return null;

  const height = Math.max(120, layout.height);

  return (
    <div className="flow-canvas flow-canvas--view" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        deleteKeyCode={null}
        minZoom={0.25}
        maxZoom={1}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} color="var(--border)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
