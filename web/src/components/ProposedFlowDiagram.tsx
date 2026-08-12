import { useMemo } from "react";
import { ReactFlow, Background, Handle, Position } from "@xyflow/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ProposedFlowStep } from "../types/domain";

const ROW_HEIGHT = 84;
const NODE_X = 16;

interface ProposedStepNodeData {
  label: string;
  index: number;
  kind: ProposedFlowStep["kind"];
  [key: string]: unknown;
}

const BADGE_TEXT: Record<ProposedFlowStep["kind"], string> = {
  automated: "Automated",
  manual: "Manual",
};

function ProposedStepNode({ data }: NodeProps) {
  const d = data as ProposedStepNodeData;
  return (
    <div className={`flow-view-node flow-view-node--proposed-${d.kind}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-step-number">{d.index + 1}</div>
      <span className="flow-view-label">{d.label}</span>
      <span className="flow-view-badge">{BADGE_TEXT[d.kind]}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { proposedStep: ProposedStepNode };

interface Props {
  proposedFlow: ProposedFlowStep[];
}

export default function ProposedFlowDiagram({ proposedFlow }: Props) {
  const nodes: Node[] = useMemo(
    () =>
      proposedFlow.map((step, index) => ({
        id: String(index),
        type: "proposedStep",
        position: { x: NODE_X, y: index * ROW_HEIGHT },
        data: { label: step.label, index, kind: step.kind },
        draggable: false,
        selectable: false,
      })),
    [proposedFlow]
  );

  const edges: Edge[] = useMemo(
    () =>
      proposedFlow.slice(1).map((_, i) => ({
        id: `pe${i}-${i + 1}`,
        source: String(i),
        target: String(i + 1),
        type: "smoothstep",
      })),
    [proposedFlow]
  );

  if (proposedFlow.length === 0) return null;

  const height = Math.max(120, proposedFlow.length * ROW_HEIGHT + 32);

  return (
    <div className="flow-canvas flow-canvas--view" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 16, zoom: 1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        panOnDrag={false}
        deleteKeyCode={null}
        minZoom={1}
        maxZoom={1}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={18} color="var(--border)" />
      </ReactFlow>
    </div>
  );
}
