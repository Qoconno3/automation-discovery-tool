import * as local from "./localClient";
import * as remote from "./remoteClient";

// The GitHub Pages demo build has no backend, so it runs entirely against a
// client-side mock (localClient) instead of the real Functions API.
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const impl = IS_DEMO_MODE ? local : remote;

export const submitProcess = impl.submitProcess;
export const submitFollowup = impl.submitFollowup;
export const listSubmissions = impl.listSubmissions;
export const getSubmission = impl.getSubmission;
export const listSampleScenarios = impl.listSampleScenarios;

export type { SampleScenario } from "../types/domain";
