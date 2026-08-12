import { useMemo } from "react";
import { ReactFlow, Background, Handle, Position } from "@xyflow/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const ROW_HEIGHT = 84;
const NODE_X = 16;

interface ViewStepNodeData {
  label: string;
  index: number;
  [key: string]: unknown;
}

function ViewStepNode({ data }: NodeProps) {
  const d = data as ViewStepNodeData;
  return (
    <div className="flow-view-node">
      <Handle type="target" position={Position.Top} />
      <div className="flow-step-number">{d.index + 1}</div>
      <span className="flow-view-label">{d.label || `Step ${d.index + 1}`}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { viewStep: ViewStepNode };

interface Props {
  steps: string[];
}

export default function ProcessFlowDiagram({ steps }: Props) {
  const nodes: Node[] = useMemo(
    () =>
      steps.map((label, index) => ({
        id: String(index),
        type: "viewStep",
        position: { x: NODE_X, y: index * ROW_HEIGHT },
        data: { label, index },
        draggable: false,
        selectable: false,
      })),
    [steps]
  );

  const edges: Edge[] = useMemo(
    () =>
      steps.slice(1).map((_, i) => ({
        id: `e${i}-${i + 1}`,
        source: String(i),
        target: String(i + 1),
        type: "smoothstep",
      })),
    [steps]
  );

  if (steps.length === 0) return null;

  const height = Math.max(120, steps.length * ROW_HEIGHT + 32);

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
