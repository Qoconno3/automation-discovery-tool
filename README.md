# Automation Discovery Tool

A discovery form for business units to describe a manual process — what it does, the tools involved,
how much time it costs, what's painful about it, and who's asking. Submitting it adds the process to a
backlog for the automation PM team to triage and go talk to the business unit about. No AI runs on
submit; the tool is deliberately just structured intake plus a backlog, not a recommendation engine.

The process flow is built and shown as an actual diagram (via [React Flow](https://reactflow.dev)),
not a text blob — you lay out steps as connected boxes on the intake form. The submission detail page
renders that same flow read-only, alongside everything else submitted, so the PM team has a clear
as-is picture of the process before they reach out.

Any step in the process can also be a **decision point**: click "+ Add decision" on a step to give it
two or more named branches (e.g. "Approved" / "Rejected"), each with its own short sequence of steps.
Branches fan out visually and implicitly rejoin the main flow at whatever step comes next — no manual
merge-point drawing, and branches can't nest further.

## Try it without installing anything

A static demo (client-side only, no backend) auto-deploys to GitHub Pages from `web/` on every push to
`main`: **https://qoconno3.github.io/automation-discovery-tool/**. History is saved to that browser's
`localStorage`, so it won't sync between devices — see [Demo mode vs. the real
app](#demo-mode-vs-the-real-app) below for what's different from a real deployment.

## Stack

- **Frontend**: React + Vite + TypeScript (`web/`)
- **Backend**: Azure Functions v4 (Node/TypeScript), hosted as a Static Web Apps managed API (`api/`)
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

You need a Storage connection string for Table Storage persistence: either point
`TABLE_STORAGE_CONNECTION_STRING` (in `api/local.settings.json`, which is gitignored) at a real dev
Storage Account, or run [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite)
locally and leave the default `UseDevelopmentStorage=true` (`npx azurite --silent --location <some-folder>`).

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

To exercise just the frontend against `localStorage` with no backend at all (what the GitHub Pages demo
runs), use `cd web && npm run dev:demo` instead.

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

# Static Web App (Free tier, no GitHub linkage — deploy manually with `swa deploy`)
az staticwebapp create \
  --name swa-automation-discovery \
  --resource-group rg-automation-discovery \
  --location eastus2 \
  --sku Free
```

Set the app settings on the Static Web App so the deployed API has what it needs (same value as your
local `local.settings.json`, minus `AzureWebJobsStorage` which SWA manages itself):

```bash
az staticwebapp appsettings set \
  --name swa-automation-discovery \
  --setting-names \
    TABLE_STORAGE_CONNECTION_STRING="<storage connection string from above>"
```

Key Vault isn't used here — app settings are fine at single-user scale. If this ever becomes a
shared/team tool, swap this for a `@Microsoft.KeyVault(...)` reference with a managed identity, and add
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
| Persistence | Browser `localStorage` — per-device, doesn't sync | Azure Table Storage — shared, durable |
| Cost | Free | Free-tier SWA + pennies for Storage |

The demo exists purely so the app is viewable from any machine with zero setup — same form, same flow
diagram, same backlog view, just backed by `localStorage` instead of a real API.

The demo build is triggered by `.github/workflows/deploy-pages.yml` on every push to `main` that touches
`web/`. To build it locally: `cd web && npm run build:pages` (sets `VITE_DEMO_MODE=true`, which switches
`web/src/api/client.ts` to `localClient.ts` instead of `remoteClient.ts`, and switches routing from
`BrowserRouter` to `HashRouter` since GitHub Pages has no server-side rewrite support).

## Project layout

```
api/                    Azure Functions app (SWA-managed API)
  src/functions/              HTTP-triggered endpoints (submit, list, get)
  src/lib/                    Table Storage client
  src/types/domain.ts         Shared TypeScript types
web/                    React + Vite frontend
  src/pages/                  Intake form, backlog history, submission detail
  src/components/             ProcessFlowBuilder (editable diagram), ProcessFlowDiagram (read-only), ThemeToggle
  src/types/domain.ts         Mirrored types (kept in sync manually with api/)
```
