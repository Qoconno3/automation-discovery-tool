import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { ReactFlow, Background, Controls, Handle, Position } from "@xyflow/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const ROW_HEIGHT = 92;
const NODE_X = 16;

interface StepNodeData {
  label: string;
  index: number;
  total: number;
  onChangeLabel: (index: number, label: string) => void;
  onDelete: (index: number) => void;
  onEnter: (index: number) => void;
  onBackspaceEmpty: (index: number) => void;
  [key: string]: unknown;
}

function StepNode({ data }: NodeProps) {
  const d = data as StepNodeData;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      d.onEnter(d.index);
    } else if (e.key === "Backspace" && d.label === "" && d.total > 1) {
      e.preventDefault();
      d.onBackspaceEmpty(d.index);
    }
  }

  return (
    <div className="flow-step-node">
      <Handle type="target" position={Position.Top} />
      <div className="flow-step-number">{d.index + 1}</div>
      <input
        className="flow-step-input nodrag nopan"
        value={d.label}
        placeholder={`Step ${d.index + 1}`}
        data-step-index={d.index}
        onChange={(e) => d.onChangeLabel(d.index, e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {d.total > 1 && (
        <button
          type="button"
          className="flow-step-delete nodrag nopan"
          onClick={() => d.onDelete(d.index)}
          aria-label={`Delete step ${d.index + 1}`}
        >
          ×
        </button>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { step: StepNode };

interface Props {
  steps: string[];
  onChange: (steps: string[]) => void;
}

export default function ProcessFlowBuilder({ steps, onChange }: Props) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusIndex === null) return;
    const el = document.querySelector<HTMLInputElement>(`[data-step-index="${focusIndex}"]`);
    el?.focus();
    setFocusIndex(null);
  }, [focusIndex, steps]);

  const handleChangeLabel = useCallback(
    (index: number, label: string) => {
      const next = [...steps];
      next[index] = label;
      onChange(next);
    },
    [steps, onChange]
  );

  const handleDelete = useCallback(
    (index: number) => {
      onChange(steps.filter((_, i) => i !== index));
    },
    [steps, onChange]
  );

  const handleAdd = useCallback(() => {
    onChange([...steps, ""]);
    setFocusIndex(steps.length);
  }, [steps, onChange]);

  const handleInsertAfter = useCallback(
    (index: number) => {
      const next = [...steps];
      next.splice(index + 1, 0, "");
      onChange(next);
      setFocusIndex(index + 1);
    },
    [steps, onChange]
  );

  const handleBackspaceEmpty = useCallback(
    (index: number) => {
      onChange(steps.filter((_, i) => i !== index));
      setFocusIndex(Math.max(0, index - 1));
    },
    [steps, onChange]
  );

  const nodes: Node[] = useMemo(
    () =>
      steps.map((label, index) => ({
        id: String(index),
        type: "step",
        position: { x: NODE_X, y: index * ROW_HEIGHT },
        data: {
          label,
          index,
          total: steps.length,
          onChangeLabel: handleChangeLabel,
          onDelete: handleDelete,
          onEnter: handleInsertAfter,
          onBackspaceEmpty: handleBackspaceEmpty,
        },
        draggable: false,
        selectable: false,
      })),
    [steps, handleChangeLabel, handleDelete, handleInsertAfter, handleBackspaceEmpty]
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

  const height = Math.max(140, steps.length * ROW_HEIGHT + 40);

  return (
    <div className="flow-builder">
      <div className="flow-canvas" style={{ height }}>
        {steps.length === 0 ? (
          <div className="flow-empty">No steps yet — add the first one below.</div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 20, zoom: 1 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnScroll={false}
            deleteKeyCode={null}
            minZoom={0.6}
            maxZoom={1.25}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} color="var(--border)" />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        )}
      </div>
      <button type="button" className="flow-add-button" onClick={handleAdd}>
        + Add step
      </button>
    </div>
  );
}
