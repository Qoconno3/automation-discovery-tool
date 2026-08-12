# Automation Discovery Tool

Describe a business process, answer a couple of follow-up questions if the model needs them, and get
back a structured recommendation: should this be automated at all, should it be the whole process or
just one bottleneck step, classic automation or AI (or both), which tool fits (Power Automate, an
Azure Function App, Playwright, Copilot Studio, Azure OpenAI), and what cost/model/risk considerations
matter. Every submission is saved so a backlog of vetted automation candidates builds up over time.

The process flow is built and shown as an actual diagram (via [React Flow](https://reactflow.dev)),
not a text blob — you lay out steps as connected boxes on the intake form. The recommendation view then
shows two diagrams: **Current process** renders those same steps read-only, exactly as submitted — no
annotation, just the as-is flow for reference. **Proposed process** is a genuinely new flow — not just
the original relabeled — showing what the process actually looks like after the recommendation is
applied: steps the automation removes are gone, new AI/system steps appear, and each remaining step is
tagged "Automated" or "Manual" so it's clear at a glance what still needs a human.

## Try it without installing anything

A static demo (client-side only, no backend, scripted sample data instead of a real LLM) auto-deploys
to GitHub Pages from `web/` on every push to `main`: **https://qoconno3.github.io/automation-discovery-tool/**.
History is saved to that browser's `localStorage`, so it won't sync between devices — see
[Demo mode vs. the real app](#demo-mode-vs-the-real-app) below for what's different from a real deployment.

## Stack

- **Frontend**: React + Vite + TypeScript (`web/`)
- **Backend**: Azure Functions v4 (Node/TypeScript), hosted as a Static Web Apps managed API (`api/`)
- **LLM**: Azure OpenAI, called with structured JSON schema outputs
- **Persistence**: Azure Table Storage (one table, `ProcessSubmissions`)
- **Hosting**: Azure Static Web Apps (Free tier)

## Prerequisites

Install once, globally:

```bash
npm install -g azure-functions-core-tools@4 @azure/static-web-apps-cli
```

You'll also want the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`) for
provisioning resources, and to be logged in (`az login`) to an Azure subscription.

## Local development

Install dependencies for both halves:

```bash
cd web && npm install
cd ../api && npm install
```

`api/local.settings.json` ships with `USE_MOCK_LLM: "true"` so the app runs **out of the box with no
Azure OpenAI resource at all** — see [Testing without Azure OpenAI](#testing-without-azure-openai-mock-mode)
below. You still need a Storage connection string for Table Storage persistence: either point
`TABLE_STORAGE_CONNECTION_STRING` at a real dev Storage Account, or run
[Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite) locally and leave the
default `UseDevelopmentStorage=true` (`npx azurite --silent --location <some-folder>`).

When you're ready to test against the real model, fill in a real Azure OpenAI endpoint/key/deployment
and set `USE_MOCK_LLM` to `"false"`. `local.settings.json` is gitignored, so none of this ever leaves
your machine.

Run both the frontend and API together, unified behind one origin (this is what makes `/api/*` calls
from the frontend work without CORS setup, matching how Static Web Apps routes in production):

```bash
swa start --run "cd web && npm run dev" --app-location web --api-location api --app-devserver-url http://localhost:5173
```

Or use the `swa-cli.config.json` in the repo root and just run:

```bash
swa start automation-discovery-tool
```

Then open the URL the SWA CLI prints (typically `http://localhost:4280`).

## Azure resources (one-time setup)

Run these once to provision what the app needs. Replace names/regions as you like — `stautomationdiscN`
must be globally unique, so pick a unique suffix.

```bash
# Resource group
az group create --name rg-automation-discovery --location eastus

# Storage account (Functions runtime + Table Storage persistence)
az storage account create \
  --name stautomationdisc1 \
  --resource-group rg-automation-discovery \
  --location eastus \
  --sku Standard_LRS

az storage account show-connection-string \
  --name stautomationdisc1 \
  --resource-group rg-automation-discovery \
  --query connectionString -o tsv

# Azure OpenAI resource + model deployment
az cognitiveservices account create \
  --name aoai-automation-discovery \
  --resource-group rg-automation-discovery \
  --location eastus \
  --kind OpenAI \
  --sku S0

az cognitiveservices account deployment create \
  --name aoai-automation-discovery \
  --resource-group rg-automation-discovery \
  --deployment-name gpt-4o-mini-recommender \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-capacity 10 \
  --sku-name Standard

az cognitiveservices account show \
  --name aoai-automation-discovery \
  --resource-group rg-automation-discovery \
  --query properties.endpoint -o tsv

az cognitiveservices account keys list \
  --name aoai-automation-discovery \
  --resource-group rg-automation-discovery \
  --query key1 -o tsv

# Static Web App (Free tier, no GitHub linkage — deploy manually with `swa deploy`)
az staticwebapp create \
  --name swa-automation-discovery \
  --resource-group rg-automation-discovery \
  --location eastus2 \
  --sku Free
```

> The model deployment must support structured outputs — a `gpt-4o` or `gpt-4o-mini` deployment on API
> version `2024-08-01-preview` or later works. Check current model/version availability in your region
> before deploying.

Set the app settings on the Static Web App so the deployed API has what it needs (same values as your
local `local.settings.json`, minus `AzureWebJobsStorage` which SWA manages itself):

```bash
az staticwebapp appsettings set \
  --name swa-automation-discovery \
  --setting-names \
    AZURE_OPENAI_ENDPOINT="<endpoint from above>" \
    AZURE_OPENAI_API_KEY="<key from above>" \
    AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-mini-recommender" \
    AZURE_OPENAI_API_VERSION="2024-10-21" \
    TABLE_STORAGE_CONNECTION_STRING="<storage connection string from above>"
```

Key Vault isn't used here — app settings are fine at single-user scale. If this ever becomes a
shared/team tool, swap these for `@Microsoft.KeyVault(...)` references with a managed identity, and add
Entra ID auth via `staticwebapp.config.json` roles (SWA supports this natively, no extra resource
needed).

## Deploy

Get a deployment token once:

```bash
az staticwebapp secrets list --name swa-automation-discovery --query properties.apiKey -o tsv
```

Then deploy (builds both `web/` and `api/` and pushes them):

```bash
swa deploy --app-location web --api-location api --output-location dist --deployment-token <token>
```

## Demo mode vs. the real app

There are two different ways this app runs, and they are not the same thing:

|  | GitHub Pages demo | Real deployment (Azure SWA) |
|---|---|---|
| Backend | None — everything runs in the browser | Azure Functions (`api/`) |
| Recommendations | Scripted sample data only (`web/src/lib/mockScenarios.ts`) | Scripted mock **or** real Azure OpenAI, depending on `USE_MOCK_LLM` |
| Persistence | Browser `localStorage` — per-device, doesn't sync | Azure Table Storage — shared, durable |
| Cost | Free | Free-tier SWA + pennies for Storage; Azure OpenAI only if you turn mock mode off |
| Freeform (non-sample) submissions | Heuristic fallback, clearly labeled as not a real recommendation | Same heuristic in mock mode, or a real model call otherwise |

The demo exists purely so the app is viewable from any machine with zero setup. The mock recommendation
logic is duplicated on purpose — `web/src/lib/mockScenarios.ts` mirrors `api/src/lib/mockRecommendationClient.ts`
so the demo needs no server at all. If you change one, consider whether the other should change too;
they're not automatically kept in sync.

The demo build is triggered by `.github/workflows/deploy-pages.yml` on every push to `main` that touches
`web/`. To build it locally: `cd web && npm run build:pages` (sets `VITE_DEMO_MODE=true`, which switches
`web/src/api/client.ts` to `localClient.ts` instead of `remoteClient.ts`, and switches routing from
`BrowserRouter` to `HashRouter` since GitHub Pages has no server-side rewrite support).

## Testing without Azure OpenAI (mock mode)

Set `USE_MOCK_LLM: "true"` in `api/local.settings.json` (this is the default) and every recommendation
call is served by `api/src/lib/mockRecommendationClient.ts` instead of a real Azure OpenAI call — no
resource, key, or cost required. This is enough to exercise the entire app: the intake form, the
follow-up clarification loop, persistence, and the backlog/history views.

The intake form shows a **"Try a sample"** row of buttons (only rendered when the API responds to
`GET /api/sampleScenarios`) that prefill the form with one of six scripted scenarios, each exercising a
different path:

| Sample | Exercises |
|---|---|
| Classic automation — invoice reconciliation | Immediate `complete`, `approach: classic` |
| AI approach — support ticket triage | Immediate `complete`, `approach: ai`, `scope: partial` |
| Skip — low-volume ad-hoc request | Immediate `complete`, `scope: skip` |
| Hybrid — vendor onboarding | Immediate `complete`, `approach: hybrid` |
| Needs follow-up — vague quarterly report | `needs_info` on round 1, `complete` on round 2 — exercises the clarification UI end-to-end |
| Round-cap test — stays vague through 2 follow-ups | `needs_info` on rounds 1 and 2, then a forced low-confidence `complete` on round 3 — exercises the 2-round cap |

Submitting a title that doesn't match one of the six falls back to a simple heuristic response (derived
from frequency/time/variability) rather than erroring, so freeform manual testing still works — its
`reasoning` field says plainly that it's a heuristic fallback, not a real recommendation. Every mock
response's `reasoning` field is tagged `[MOCK RESPONSE — ...]` so it's never mistaken for real model
output, including in the persisted history.

Flip `USE_MOCK_LLM` to `"false"` (and fill in real Azure OpenAI values) once you want to test against
the real model — no other code changes needed, same request/response shape either way.

## Project layout

```
api/                    Azure Functions app (SWA-managed API)
  prompts/systemPrompt.md    The recommendation decision framework — edit this to tune recommendations
  src/functions/              HTTP-triggered endpoints
  src/lib/                    Azure OpenAI + mock clients, recommendation engine dispatcher,
                               Table Storage client, prompt loader
  src/types/domain.ts         Shared TypeScript types
web/                    React + Vite frontend
  src/pages/                  Intake form (incl. sample-scenario picker), backlog history, submission detail
  src/components/             Follow-up question UI, recommendation display,
                               ProcessFlowBuilder (editable diagram) + ProcessFlowDiagram (read-only, annotated)
  src/types/domain.ts         Mirrored types (kept in sync manually with api/)
```

## Tuning recommendations

The entire decision framework lives in `api/prompts/systemPrompt.md` as plain text — edit it and
restart the API (no code changes needed) to change how the model reasons about scope, classic-vs-AI,
tool selection, cost tiers, and risk. It also controls the clarification loop: the model can ask up to
2 rounds of follow-up questions before it's required to commit to a final recommendation.
