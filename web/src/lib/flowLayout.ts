import type { ProcessStep } from "../types/domain";

export const ROW_HEIGHT = 92;
export const COLUMN_WIDTH = 420;
const BASE_X = 16;

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: "main" | "branchHeader" | "branchStep";
  mainIndex: number;
  branchIndex?: number;
  subIndex?: number;
  isDecision: boolean;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

export interface FlowLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  height: number;
}

export function mainNodeId(mainIndex: number): string {
  return `m${mainIndex}`;
}

export function branchHeaderId(mainIndex: number, branchIndex: number): string {
  return `m${mainIndex}-b${branchIndex}-h`;
}

export function branchStepId(mainIndex: number, branchIndex: number, subIndex: number): string {
  return `m${mainIndex}-b${branchIndex}-s${subIndex}`;
}

/**
 * Lays out a (possibly branching) process flow top-to-bottom. Decision steps fan out
 * into side-by-side branch columns; all branches implicitly rejoin the main column at
 * whatever step comes next (or just terminate, if the decision is the last step).
 */
export function computeFlowLayout(steps: ProcessStep[]): FlowLayout {
  const maxBranches = steps.reduce((max, s) => Math.max(max, s.branches?.length ?? 0), 0);
  const centerX = maxBranches > 1 ? BASE_X + Math.ceil((maxBranches - 1) / 2) * COLUMN_WIDTH : BASE_X;

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  let y = 0;
  let pendingSources: string[] = [];

  steps.forEach((step, mainIndex) => {
    const id = mainNodeId(mainIndex);
    const isDecision = !!step.branches && step.branches.length > 1;
    nodes.push({ id, x: centerX, y, label: step.label, kind: "main", mainIndex, isDecision });
    for (const source of pendingSources) {
      edges.push({ id: `e-${source}-${id}`, source, target: id });
    }

    if (isDecision) {
      const branches = step.branches!;
      const decisionY = y;
      const headerY = decisionY + ROW_HEIGHT;
      let maxBranchRows = 1; // header row, at minimum
      const tails: string[] = [];

      branches.forEach((branch, branchIndex) => {
        const bx = centerX + (branchIndex - (branches.length - 1) / 2) * COLUMN_WIDTH;
        const headerId = branchHeaderId(mainIndex, branchIndex);
        nodes.push({
          id: headerId,
          x: bx,
          y: headerY,
          label: branch.label,
          kind: "branchHeader",
          mainIndex,
          branchIndex,
          isDecision: false,
        });
        edges.push({ id: `e-${id}-${headerId}`, source: id, target: headerId });

        let prevId = headerId;
        let stepY = headerY + ROW_HEIGHT;
        branch.steps.forEach((label, subIndex) => {
          const stepId = branchStepId(mainIndex, branchIndex, subIndex);
          nodes.push({ id: stepId, x: bx, y: stepY, label, kind: "branchStep", mainIndex, branchIndex, subIndex, isDecision: false });
          edges.push({ id: `e-${prevId}-${stepId}`, source: prevId, target: stepId });
          prevId = stepId;
          stepY += ROW_HEIGHT;
        });

        maxBranchRows = Math.max(maxBranchRows, 1 + branch.steps.length);
        tails.push(prevId);
      });

      y = headerY + maxBranchRows * ROW_HEIGHT;
      pendingSources = tails;
    } else {
      y += ROW_HEIGHT;
      pendingSources = [id];
    }
  });

  const maxY = nodes.reduce((max, n) => Math.max(max, n.y), 0);
  return { nodes, edges, height: maxY + ROW_HEIGHT };
}
