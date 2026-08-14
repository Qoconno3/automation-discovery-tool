import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ReactFlow, Background, Controls, Handle, Position } from "@xyflow/react";
import type { Edge, Node, NodeProps, ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { computeFlowLayout, mainNodeId, branchHeaderId, branchStepId } from "../lib/flowLayout";
import type { LayoutNode } from "../lib/flowLayout";
import type { ProcessStep } from "../types/domain";

const BRANCH_LETTERS = "ABCDEFGH";

// ---------- Main step node ----------

interface MainNodeData {
  label: string;
  mainIndex: number;
  total: number;
  isDecision: boolean;
  onChangeLabel: (mainIndex: number, label: string) => void;
  onDelete: (mainIndex: number) => void;
  onEnter: (mainIndex: number) => void;
  onBackspaceEmpty: (mainIndex: number) => void;
  onAddDecision: (mainIndex: number) => void;
  onAddBranch: (mainIndex: number) => void;
  onRemoveDecision: (mainIndex: number) => void;
  [key: string]: unknown;
}

function MainStepNode({ data }: NodeProps) {
  const d = data as MainNodeData;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      d.onEnter(d.mainIndex);
    } else if (e.key === "Backspace" && d.label === "" && d.total > 1) {
      e.preventDefault();
      d.onBackspaceEmpty(d.mainIndex);
    }
  }

  return (
    <div className="flow-step-wrap">
      <div className="flow-step-node">
        <Handle type="target" position={Position.Top} />
        <div className="flow-step-drag-handle" title="Drag to reorder" aria-label={`Drag to reorder step ${d.mainIndex + 1}`}>
          ⠿
        </div>
        <div className="flow-step-number">{d.mainIndex + 1}</div>
        <input
          className="flow-step-input nodrag nopan"
          value={d.label}
          placeholder={`Step ${d.mainIndex + 1}`}
          data-path={mainNodeId(d.mainIndex)}
          onChange={(e) => d.onChangeLabel(d.mainIndex, e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {d.isDecision && <span className="flow-decision-badge">Decision</span>}
        {d.total > 1 && (
          <button
            type="button"
            className="flow-step-delete nodrag nopan"
            onClick={() => d.onDelete(d.mainIndex)}
            aria-label={`Delete step ${d.mainIndex + 1}`}
          >
            ×
          </button>
        )}
        <Handle type="source" position={Position.Bottom} />
        <button
          type="button"
          className="flow-step-add-dot nodrag nopan"
          onClick={() => d.onEnter(d.mainIndex)}
          aria-label={`Add step after step ${d.mainIndex + 1}`}
          title="Add step here"
        >
          +
        </button>
      </div>
      <div className="flow-branch-toolbar nodrag nopan">
        {d.isDecision ? (
          <>
            <button type="button" className="flow-branch-toolbar-button" onClick={() => d.onAddBranch(d.mainIndex)}>
              + Add branch
            </button>
            <button type="button" className="flow-branch-toolbar-button flow-branch-toolbar-button--danger" onClick={() => d.onRemoveDecision(d.mainIndex)}>
              Remove decision
            </button>
          </>
        ) : (
          <button type="button" className="flow-branch-toolbar-button" onClick={() => d.onAddDecision(d.mainIndex)}>
            + Add decision
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Branch header node ----------

interface BranchHeaderData {
  label: string;
  mainIndex: number;
  branchIndex: number;
  onChangeLabel: (mainIndex: number, branchIndex: number, label: string) => void;
  onRemoveBranch: (mainIndex: number, branchIndex: number) => void;
  onAddStep: (mainIndex: number, branchIndex: number) => void;
  [key: string]: unknown;
}

function BranchHeaderNode({ data }: NodeProps) {
  const d = data as BranchHeaderData;
  return (
    <div className="flow-branch-header">
      <Handle type="target" position={Position.Top} />
      <input
        className="flow-branch-header-input nodrag nopan"
        value={d.label}
        placeholder="Branch name"
        onChange={(e) => d.onChangeLabel(d.mainIndex, d.branchIndex, e.target.value)}
      />
      <button
        type="button"
        className="flow-step-delete nodrag nopan"
        onClick={() => d.onRemoveBranch(d.mainIndex, d.branchIndex)}
        aria-label="Remove branch"
      >
        ×
      </button>
      <button type="button" className="flow-branch-add-step nodrag nopan" onClick={() => d.onAddStep(d.mainIndex, d.branchIndex)}>
        + Add step
      </button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

// ---------- Branch step node ----------

interface BranchStepData {
  label: string;
  mainIndex: number;
  branchIndex: number;
  subIndex: number;
  onChangeLabel: (mainIndex: number, branchIndex: number, subIndex: number, label: string) => void;
  onDelete: (mainIndex: number, branchIndex: number, subIndex: number) => void;
  onEnter: (mainIndex: number, branchIndex: number, subIndex: number) => void;
  onBackspaceEmpty: (mainIndex: number, branchIndex: number, subIndex: number) => void;
  [key: string]: unknown;
}

function BranchStepNode({ data }: NodeProps) {
  const d = data as BranchStepData;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      d.onEnter(d.mainIndex, d.branchIndex, d.subIndex);
    } else if (e.key === "Backspace" && d.label === "") {
      e.preventDefault();
      d.onBackspaceEmpty(d.mainIndex, d.branchIndex, d.subIndex);
    }
  }

  return (
    <div className="flow-step-node">
      <Handle type="target" position={Position.Top} />
      <input
        className="flow-step-input nodrag nopan"
        value={d.label}
        placeholder="Step"
        data-path={branchStepId(d.mainIndex, d.branchIndex, d.subIndex)}
        onChange={(e) => d.onChangeLabel(d.mainIndex, d.branchIndex, d.subIndex, e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="flow-step-delete nodrag nopan"
        onClick={() => d.onDelete(d.mainIndex, d.branchIndex, d.subIndex)}
        aria-label="Delete step"
      >
        ×
      </button>
      <Handle type="source" position={Position.Bottom} />
      <button
        type="button"
        className="flow-step-add-dot nodrag nopan"
        onClick={() => d.onEnter(d.mainIndex, d.branchIndex, d.subIndex)}
        aria-label="Add step here"
        title="Add step here"
      >
        +
      </button>
    </div>
  );
}

const nodeTypes = { main: MainStepNode, branchHeader: BranchHeaderNode, branchStep: BranchStepNode };

interface Props {
  steps: ProcessStep[];
  onChange: (steps: ProcessStep[]) => void;
}

export default function ProcessFlowBuilder({ steps, onChange }: Props) {
  const [focusPath, setFocusPath] = useState<string | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);

  useEffect(() => {
    if (!focusPath) return;
    const el = document.querySelector<HTMLInputElement>(`[data-path="${focusPath}"]`);
    el?.focus();
    setFocusPath(null);
  }, [focusPath, steps]);

  // Fingerprint of the flow's shape (branch/step counts), ignoring label text, so we
  // only re-fit the viewport on structural changes (add/remove step, branch, decision) —
  // XYFlow's `fitView` prop only fits once on mount, so without this, growing the flow
  // (e.g. adding a 3rd/4th decision branch) can leave new content scaled/panned off-screen.
  const structureKey = useMemo(
    () => steps.map((s) => (s.branches ? `d${s.branches.map((b) => b.steps.length).join(",")}` : "s")).join("|"),
    [steps]
  );

  useEffect(() => {
    reactFlowRef.current?.fitView({ padding: 0.15, maxZoom: 1 });
  }, [structureKey]);

  // ---------- Main flow ----------

  const updateMainLabel = useCallback(
    (mainIndex: number, label: string) => {
      onChange(steps.map((s, i) => (i === mainIndex ? { ...s, label } : s)));
    },
    [steps, onChange]
  );

  const deleteMainStep = useCallback(
    (mainIndex: number) => {
      onChange(steps.filter((_, i) => i !== mainIndex));
    },
    [steps, onChange]
  );

  const insertMainAfter = useCallback(
    (mainIndex: number) => {
      const next = [...steps];
      next.splice(mainIndex + 1, 0, { label: "" });
      onChange(next);
      setFocusPath(mainNodeId(mainIndex + 1));
    },
    [steps, onChange]
  );

  const backspaceMainEmpty = useCallback(
    (mainIndex: number) => {
      onChange(steps.filter((_, i) => i !== mainIndex));
      setFocusPath(mainNodeId(Math.max(0, mainIndex - 1)));
    },
    [steps, onChange]
  );

  const addMainStep = useCallback(() => {
    onChange([...steps, { label: "" }]);
    setFocusPath(mainNodeId(steps.length));
  }, [steps, onChange]);

  const reorderMain = useCallback(
    (oldIndex: number, newIndex: number) => {
      const next = [...steps];
      if (newIndex !== oldIndex) {
        const [moved] = next.splice(oldIndex, 1);
        next.splice(newIndex, 0, moved);
      }
      // Always emit a new array, even with no reorder, so React Flow re-syncs
      // this node's position and snaps it back onto the grid.
      onChange(next);
    },
    [steps, onChange]
  );

  // ---------- Decision / branches ----------

  const addDecision = useCallback(
    (mainIndex: number) => {
      onChange(
        steps.map((s, i) =>
          i === mainIndex
            ? { ...s, branches: [{ label: "Option A", steps: [] }, { label: "Option B", steps: [] }] }
            : s
        )
      );
    },
    [steps, onChange]
  );

  const removeDecision = useCallback(
    (mainIndex: number) => {
      onChange(steps.map((s, i) => (i === mainIndex ? { label: s.label } : s)));
    },
    [steps, onChange]
  );

  const addBranch = useCallback(
    (mainIndex: number) => {
      onChange(
        steps.map((s, i) => {
          if (i !== mainIndex || !s.branches) return s;
          const letter = BRANCH_LETTERS[s.branches.length] ?? String(s.branches.length + 1);
          return { ...s, branches: [...s.branches, { label: `Option ${letter}`, steps: [] }] };
        })
      );
    },
    [steps, onChange]
  );

  const removeBranch = useCallback(
    (mainIndex: number, branchIndex: number) => {
      onChange(
        steps.map((s, i) => {
          if (i !== mainIndex || !s.branches) return s;
          const remaining = s.branches.filter((_, bi) => bi !== branchIndex);
          return remaining.length >= 2 ? { ...s, branches: remaining } : { label: s.label };
        })
      );
    },
    [steps, onChange]
  );

  const updateBranchLabel = useCallback(
    (mainIndex: number, branchIndex: number, label: string) => {
      onChange(
        steps.map((s, i) => {
          if (i !== mainIndex || !s.branches) return s;
          return { ...s, branches: s.branches.map((b, bi) => (bi === branchIndex ? { ...b, label } : b)) };
        })
      );
    },
    [steps, onChange]
  );

  // ---------- Branch steps ----------

  const updateBranchStepLabel = useCallback(
    (mainIndex: number, branchIndex: number, subIndex: number, label: string) => {
      onChange(
        steps.map((s, i) => {
          if (i !== mainIndex || !s.branches) return s;
          return {
            ...s,
            branches: s.branches.map((b, bi) =>
              bi === branchIndex ? { ...b, steps: b.steps.map((st, si) => (si === subIndex ? label : st)) } : b
            ),
          };
        })
      );
    },
    [steps, onChange]
  );

  const deleteBranchStep = useCallback(
    (mainIndex: number, branchIndex: number, subIndex: number) => {
      onChange(
        steps.map((s, i) => {
          if (i !== mainIndex || !s.branches) return s;
          return {
            ...s,
            branches: s.branches.map((b, bi) =>
              bi === branchIndex ? { ...b, steps: b.steps.filter((_, si) => si !== subIndex) } : b
            ),
          };
        })
      );
    },
    [steps, onChange]
  );

  const insertBranchStepAfter = useCallback(
    (mainIndex: number, branchIndex: number, subIndex: number) => {
      onChange(
        steps.map((s, i) => {
          if (i !== mainIndex || !s.branches) return s;
          return {
            ...s,
            branches: s.branches.map((b, bi) => {
              if (bi !== branchIndex) return b;
              const bsteps = [...b.steps];
              bsteps.splice(subIndex + 1, 0, "");
              return { ...b, steps: bsteps };
            }),
          };
        })
      );
      setFocusPath(branchStepId(mainIndex, branchIndex, subIndex + 1));
    },
    [steps, onChange]
  );

  const addBranchStep = useCallback(
    (mainIndex: number, branchIndex: number) => {
      let newSubIndex = 0;
      onChange(
        steps.map((s, i) => {
          if (i !== mainIndex || !s.branches) return s;
          return {
            ...s,
            branches: s.branches.map((b, bi) => {
              if (bi !== branchIndex) return b;
              newSubIndex = b.steps.length;
              return { ...b, steps: [...b.steps, ""] };
            }),
          };
        })
      );
      setFocusPath(branchStepId(mainIndex, branchIndex, newSubIndex));
    },
    [steps, onChange]
  );

  const backspaceBranchStepEmpty = useCallback(
    (mainIndex: number, branchIndex: number, subIndex: number) => {
      deleteBranchStep(mainIndex, branchIndex, subIndex);
      if (subIndex > 0) {
        setFocusPath(branchStepId(mainIndex, branchIndex, subIndex - 1));
      } else {
        setFocusPath(branchHeaderId(mainIndex, branchIndex));
      }
    },
    [deleteBranchStep]
  );

  // ---------- Layout → React Flow nodes/edges ----------

  const layout = useMemo(() => computeFlowLayout(steps), [steps]);

  const nodes: Node[] = useMemo(
    () =>
      layout.nodes.map((n: LayoutNode) => {
        if (n.kind === "main") {
          const data: MainNodeData = {
            label: n.label,
            mainIndex: n.mainIndex,
            total: steps.length,
            isDecision: n.isDecision,
            onChangeLabel: updateMainLabel,
            onDelete: deleteMainStep,
            onEnter: insertMainAfter,
            onBackspaceEmpty: backspaceMainEmpty,
            onAddDecision: addDecision,
            onAddBranch: addBranch,
            onRemoveDecision: removeDecision,
          };
          return {
            id: n.id,
            type: "main",
            position: { x: n.x, y: n.y },
            data,
            draggable: true,
            dragHandle: ".flow-step-drag-handle",
            selectable: false,
          };
        }
        if (n.kind === "branchHeader") {
          const data: BranchHeaderData = {
            label: n.label,
            mainIndex: n.mainIndex,
            branchIndex: n.branchIndex!,
            onChangeLabel: updateBranchLabel,
            onRemoveBranch: removeBranch,
            onAddStep: addBranchStep,
          };
          return {
            id: n.id,
            type: "branchHeader",
            position: { x: n.x, y: n.y },
            data,
            draggable: false,
            selectable: false,
            // Non-draggable, non-selectable nodes get `pointer-events: none` from XYFlow by
            // default, which would swallow real mouse clicks on the input/buttons inside.
            style: { pointerEvents: "all" },
          };
        }
        const data: BranchStepData = {
          label: n.label,
          mainIndex: n.mainIndex,
          branchIndex: n.branchIndex!,
          subIndex: n.subIndex!,
          onChangeLabel: updateBranchStepLabel,
          onDelete: deleteBranchStep,
          onEnter: insertBranchStepAfter,
          onBackspaceEmpty: backspaceBranchStepEmpty,
        };
        return {
          id: n.id,
          type: "branchStep",
          position: { x: n.x, y: n.y },
          data,
          draggable: false,
          selectable: false,
          style: { pointerEvents: "all" },
        };
      }),
    [
      layout,
      steps,
      updateMainLabel,
      deleteMainStep,
      insertMainAfter,
      backspaceMainEmpty,
      addDecision,
      addBranch,
      removeDecision,
      updateBranchLabel,
      removeBranch,
      addBranchStep,
      updateBranchStepLabel,
      deleteBranchStep,
      insertBranchStepAfter,
      backspaceBranchStepEmpty,
    ]
  );

  const edges: Edge[] = useMemo(
    () => layout.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: "smoothstep" })),
    [layout]
  );

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: Node) => {
      const meta = layout.nodes.find((n) => n.id === node.id);
      if (!meta || meta.kind !== "main") return;
      const mainYs = layout.nodes.filter((n) => n.kind === "main").map((n) => n.y);
      let newIndex = 0;
      mainYs.forEach((y, i) => {
        if (i === meta.mainIndex) return;
        if (y < node.position.y) newIndex++;
      });
      reorderMain(meta.mainIndex, Math.min(Math.max(newIndex, 0), steps.length - 1));
    },
    [layout, reorderMain, steps.length]
  );

  const height = Math.max(140, layout.height);

  return (
    <div className="flow-builder">
      <div className="flow-canvas" style={{ height }}>
        {steps.length === 0 ? (
          <div className="flow-empty">No steps yet — add the first one below.</div>
        ) : (
          <ReactFlow
            onInit={(instance) => {
              reactFlowRef.current = instance;
            }}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnScroll={false}
            deleteKeyCode={null}
            minZoom={0.6}
            maxZoom={1.25}
            proOptions={{ hideAttribution: true }}
            onNodeDragStop={handleNodeDragStop}
          >
            <Background gap={18} color="var(--border)" />
            <Controls showInteractive={false} position="top-right" />
          </ReactFlow>
        )}
      </div>
      <button type="button" className="flow-add-button" onClick={addMainStep}>
        + Add step
      </button>
    </div>
  );
}
