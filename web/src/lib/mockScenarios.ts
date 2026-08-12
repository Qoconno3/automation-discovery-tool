import { MAX_FOLLOWUP_ROUNDS } from "./constants";
import type { FollowupRound, LlmResponse, ProcessIntake, ProposedFlowStep } from "../types/domain";

const MOCK_TAG = " [MOCK RESPONSE — scripted test scenario, no LLM call made.]";

function tagged(recommendation: LlmResponse): LlmResponse {
  if (recommendation.status !== "complete") return recommendation;
  return {
    ...recommendation,
    recommendation: {
      ...recommendation.recommendation,
      reasoning: recommendation.recommendation.reasoning + MOCK_TAG,
    },
  };
}

export interface MockScenario {
  label: string;
  intake: ProcessIntake;
  /** One LlmResponse per follow-up round; the last entry repeats if a round exceeds the script length. */
  script: LlmResponse[];
}

export const SAMPLE_SCENARIOS: MockScenario[] = [
  {
    label: "Classic automation — invoice reconciliation",
    intake: {
      title: "Weekly vendor invoice reconciliation",
      description:
        "AP team manually matches vendor invoices to purchase orders each week before payment can be released.",
      currentTools: "Outlook, Excel, SAP",
      steps: [
        { label: "Download invoice PDFs from a shared inbox" },
        { label: "Open SAP and pull the matching PO" },
        { label: "Manually compare line items and quantities" },
        { label: "Flag mismatches for manager review" },
        { label: "Approve matches for payment" },
      ],
      frequency: "weekly",
      volumePerOccurrence: "40 invoices",
      timeSpentPerOccurrenceMinutes: 120,
      numberOfPeopleInvolved: 2,
      painPoints:
        "Slow and error-prone; causes late payments to vendors and occasional duplicate payments.",
      variability: "highly standardized",
      dataSensitivity: "confidential",
      dataSensitivityNotes: "Invoice data includes vendor banking details.",
      hasApiOrIntegrationAccess: "yes",
      changeFrequency: "stable, rarely changes",
      urgency: "high",
    },
    script: [
      {
        status: "complete",
        recommendation: {
          scope: "full",
          scopeRationale:
            "The entire flow — pulling invoices, matching to POs, flagging mismatches — is standardized and repeatable, and at 40 invoices/week x 2 people x 2 hours it's costing roughly 200+ hours/year.",
          approach: "classic",
          approachRationale:
            "SAP exposes an API and the matching rules (line items, quantities) are deterministic — this needs reliable rule execution and an audit trail, not judgment, which favors classic automation over AI.",
          bottleneckStepIndex: null,
          proposedFlow: [
            { label: "Function App pulls invoices and matching POs from SAP automatically", kind: "automated" },
            { label: "Function App compares line items and quantities against the matching rules", kind: "automated" },
            { label: "Clean matches are automatically approved for payment", kind: "automated" },
            { label: "Mismatches are flagged and routed to a manager via Power Automate", kind: "automated" },
            { label: "Manager reviews flagged mismatches and approves payment", kind: "manual" },
          ],
          recommendedTools: [
            {
              tool: "Azure Function App",
              role: "Core matching engine",
              rationale:
                "Pulls invoices and POs via SAP's API, applies the matching rules, and writes results back — needs real logic and testability beyond what Power Automate's connectors alone give you.",
            },
            {
              tool: "Power Automate",
              role: "Notifications & approvals",
              rationale:
                "Good fit for routing mismatches to a manager for review via Teams/Outlook without custom code.",
            },
          ],
          modelGuidance: {
            tierNeeded: "none",
            reasoning: "No judgment or unstructured text involved — this is deterministic rule matching.",
            estimatedTokenCostNotes: "N/A",
          },
          humanInTheLoopNeeded: true,
          humanInTheLoopNotes:
            "Mismatches should still route to a human for approval before payment release, given this touches vendor banking data.",
          risks: [
            {
              risk: "Invoice/PO data includes vendor banking details (confidential)",
              severity: "medium",
              mitigation:
                "Keep the matching logic and data entirely within the Function App/SAP boundary; don't route this data through any AI service.",
            },
            {
              risk: "SAP API changes could break the integration",
              severity: "low",
              mitigation: "Process is stable and rarely changes, so this is a minor ongoing risk, not a blocker.",
            },
          ],
          estimatedBuildEffort: "days",
          roiNotes: "At ~208 hours/year of manual work, even a few days of build time pays back within a month or two.",
          confidence: "high",
          reasoning:
            "Standardized rules, API access, high volume, and low variability — a textbook classic-automation case.",
        },
      },
    ],
  },
  {
    label: "AI approach — support ticket triage",
    intake: {
      title: "Customer support ticket triage",
      description:
        "Incoming support tickets need to be read and routed to the right team (billing, technical, account management) before anyone can work them.",
      currentTools: "Zendesk, Outlook",
      steps: [
        { label: "Ticket arrives in Zendesk" },
        { label: "Agent reads it and decides which team it belongs to" },
        { label: "Agent reassigns the ticket to that team's queue" },
        { label: "Team picks it up" },
      ],
      frequency: "daily",
      volumePerOccurrence: "150 tickets",
      timeSpentPerOccurrenceMinutes: 3,
      numberOfPeopleInvolved: 1,
      painPoints:
        "Triage eats up an agent's whole morning, and misrouted tickets cause delays and frustrated customers.",
      variability: "highly variable",
      dataSensitivity: "internal",
      dataSensitivityNotes: "",
      hasApiOrIntegrationAccess: "yes",
      changeFrequency: "changes occasionally",
      urgency: "medium",
    },
    script: [
      {
        status: "complete",
        recommendation: {
          scope: "partial",
          scopeRationale:
            "The actual resolution work still needs a human, but the triage/routing step alone is ~7.5 hours/week of pure classification work with no judgment beyond 'which team.'",
          approach: "ai",
          approachRationale:
            "Ticket content is unstructured natural language and categories are fuzzy enough that a keyword/rules engine would be brittle and need constant tuning — this is squarely a classification task an LLM handles well.",
          bottleneckStepIndex: 1,
          proposedFlow: [
            { label: "Ticket arrives in Zendesk", kind: "automated" },
            { label: "Azure OpenAI classifies the ticket and decides which team it belongs to", kind: "automated" },
            { label: "Ticket is automatically reassigned to that team's queue", kind: "automated" },
            { label: "Team picks it up and resolves it", kind: "manual" },
          ],
          recommendedTools: [
            {
              tool: "Azure Function App",
              role: "Orchestration",
              rationale:
                "Triggered on a new-ticket webhook from Zendesk, calls Azure OpenAI, writes the routing decision back via Zendesk's API.",
            },
            {
              tool: "Azure OpenAI",
              role: "Classification",
              rationale:
                "Classifies ticket text into billing/technical/account-management with a short prompt — a bounded, well-defined categorization task.",
            },
          ],
          modelGuidance: {
            tierNeeded: "small/cheap (e.g. gpt-4o-mini)",
            reasoning: "Classifying into 3 known categories from a short ticket body doesn't need frontier reasoning.",
            estimatedTokenCostNotes:
              "150 tickets/day of short prompts is a low, predictable monthly cost on a small model — likely single-digit dollars/month.",
          },
          humanInTheLoopNeeded: true,
          humanInTheLoopNotes:
            "Low-confidence classifications should fall back to the current manual queue rather than auto-routing, to avoid silently misrouting a ticket.",
          risks: [
            {
              risk: "Misclassification could route urgent tickets to the wrong team",
              severity: "medium",
              mitigation: "Add a confidence threshold — anything below it stays in the manual triage queue.",
            },
          ],
          estimatedBuildEffort: "days",
          roiNotes: "Reclaims roughly 7.5 hours/week of agent time currently spent purely on routing, not resolution.",
          confidence: "high",
          reasoning:
            "Unstructured input, a bounded category set, and tolerance for occasional error with a human fallback — a good fit for an AI classification step.",
        },
      },
    ],
  },
  {
    label: "Skip — low-volume ad-hoc request",
    intake: {
      title: "Ad-hoc conference room booking requests",
      description:
        "Occasionally someone emails the office manager asking to book a conference room for a one-off event that doesn't fit the standard calendar booking tool.",
      currentTools: "Outlook, email",
      steps: [
        { label: "Someone emails asking for a room" },
        { label: "Office manager checks availability" },
        { label: "Office manager replies confirming or suggesting alternatives" },
      ],
      frequency: "ad-hoc",
      volumePerOccurrence: "2-3 requests",
      timeSpentPerOccurrenceMinutes: 10,
      numberOfPeopleInvolved: 1,
      painPoints: "Mildly annoying but not a big deal.",
      variability: "highly variable",
      dataSensitivity: "public",
      dataSensitivityNotes: "",
      hasApiOrIntegrationAccess: "unknown",
      changeFrequency: "changes often",
      urgency: "low",
    },
    script: [
      {
        status: "complete",
        recommendation: {
          scope: "skip",
          scopeRationale:
            "A handful of ad-hoc requests a month at 10 minutes each is under an hour a month of total time — the build and maintenance cost of any automation here would exceed the time it saves.",
          approach: "classic",
          approachRationale: "Not applicable — this doesn't clear the bar for automation at all given the volume.",
          bottleneckStepIndex: null,
          proposedFlow: [
            { label: "Someone emails asking for a room", kind: "manual" },
            { label: "Office manager checks availability", kind: "manual" },
            { label: "Office manager replies confirming or suggesting alternatives", kind: "manual" },
          ],
          recommendedTools: [],
          modelGuidance: { tierNeeded: "none", reasoning: "N/A — recommending against automating this.", estimatedTokenCostNotes: "N/A" },
          humanInTheLoopNeeded: false,
          humanInTheLoopNotes: "N/A",
          risks: [],
          estimatedBuildEffort: "hours",
          roiNotes: "Even a few hours of build time wouldn't be paid back — the volume is too low and too irregular to justify it.",
          confidence: "high",
          reasoning:
            "Low frequency, low time-per-occurrence, high variability, and no clear repeatable pattern — the clearest possible 'don't automate' case.",
        },
      },
    ],
  },
  {
    label: "Hybrid — vendor onboarding",
    intake: {
      title: "New vendor onboarding workflow",
      description:
        "When a new vendor is added, several deterministic setup steps happen alongside a compliance document review that requires judgment.",
      currentTools: "SharePoint, Outlook, an internal vendor database",
      steps: [
        { label: "New vendor record created in SharePoint list" },
        { label: "System sends the vendor a standard document request email" },
        { label: "Vendor uploads compliance documents (insurance certs, W-9, etc)" },
        { label: "Compliance reviews the documents for completeness and red flags" },
        { label: "Vendor record is activated and a welcome email is sent" },
      ],
      frequency: "monthly",
      volumePerOccurrence: "15 new vendors",
      timeSpentPerOccurrenceMinutes: 45,
      numberOfPeopleInvolved: 1,
      painPoints:
        "The deterministic parts (record creation, emails, activation) are pure busywork; the document review is the only part that actually needs a person.",
      variability: "some exceptions",
      dataSensitivity: "confidential",
      dataSensitivityNotes: "Vendor compliance documents may include insurance/financial details.",
      hasApiOrIntegrationAccess: "yes",
      changeFrequency: "changes occasionally",
      urgency: "medium",
    },
    script: [
      {
        status: "complete",
        recommendation: {
          scope: "full",
          scopeRationale:
            "Every step in this flow is either fully deterministic or a bounded document-completeness check — no part of it genuinely requires open-ended human judgment beyond a first-pass review.",
          approach: "hybrid",
          approachRationale:
            "Record creation, emails, and activation are deterministic — classic automation. Document completeness/red-flag review is judgment over unstructured PDFs — a good fit for an embedded AI step, with a human still making the final approval call.",
          bottleneckStepIndex: null,
          proposedFlow: [
            { label: "Power Automate creates the vendor record and sends the document request automatically", kind: "automated" },
            { label: "Vendor uploads compliance documents", kind: "manual" },
            { label: "Azure OpenAI reviews the documents and flags missing items or red flags", kind: "automated" },
            { label: "Compliance reviews the AI's first-pass flags and makes the final call", kind: "manual" },
            { label: "Power Automate activates the vendor record and sends the welcome email", kind: "automated" },
          ],
          recommendedTools: [
            {
              tool: "Power Automate",
              role: "Workflow orchestration",
              rationale:
                "Handles record creation, email sends, and status tracking against SharePoint — strong connector fit, no custom code needed for this part.",
            },
            {
              tool: "Azure OpenAI",
              role: "First-pass document review",
              rationale:
                "Reads uploaded compliance documents and flags missing items or obvious red flags before a human does the final review.",
            },
            {
              tool: "Azure Function App",
              role: "Glue logic",
              rationale:
                "Calls Azure OpenAI on document upload and writes the first-pass results back into the SharePoint record for Power Automate to route.",
            },
          ],
          modelGuidance: {
            tierNeeded: "frontier (e.g. gpt-4o)",
            reasoning:
              "Reviewing compliance documents for completeness and red flags is more nuanced than simple classification and benefits from stronger reasoning.",
            estimatedTokenCostNotes:
              "15 vendors/month with a handful of documents each is low volume — a frontier model here is affordable even at the pricier tier.",
          },
          humanInTheLoopNeeded: true,
          humanInTheLoopNotes:
            "Final compliance approval should stay with a human — the AI step should only do first-pass flagging, not final sign-off, given the confidential financial/insurance data involved.",
          risks: [
            {
              risk: "Compliance documents contain confidential financial/insurance details",
              severity: "medium",
              mitigation: "Use the team's own Azure OpenAI tenant, not a public endpoint, and scope access to the Function App only.",
            },
            {
              risk: "AI first-pass review could miss a genuine red flag",
              severity: "medium",
              mitigation: "Treat the AI output as a triage aid only — a human still reviews every document before approval.",
            },
          ],
          estimatedBuildEffort: "weeks",
          roiNotes: "45 minutes x 15 vendors/month is ~9 hours/month of mostly busywork reclaimed, plus faster vendor activation.",
          confidence: "medium",
          reasoning:
            "A clean hybrid case — deterministic steps are obvious Power Automate territory, and the one judgment step is bounded enough for an AI-assisted first pass with a human still deciding.",
        },
      },
    ],
  },
  {
    label: "Needs follow-up — vague quarterly report",
    intake: {
      title: "Quarterly compliance report generation",
      description: "Someone pulls together a report for compliance each quarter.",
      currentTools: "various internal systems",
      steps: [{ label: "Gather data from a few places" }, { label: "Put it into a report" }],
      frequency: "quarterly",
      volumePerOccurrence: "1 report",
      timeSpentPerOccurrenceMinutes: 480,
      numberOfPeopleInvolved: 1,
      painPoints: "Takes a really long time and is stressful right before the deadline.",
      variability: "some exceptions",
      dataSensitivity: "internal",
      dataSensitivityNotes: "",
      hasApiOrIntegrationAccess: "unknown",
      changeFrequency: "changes occasionally",
      urgency: "medium",
    },
    script: [
      {
        status: "needs_info",
        partialAssessment:
          "This is clearly a high-effort, low-frequency process (8 hours/quarter) with real pain around deadline stress — worth automating something here. But 'various internal systems' and 'gather data... put it into a report' are too vague to tell whether this is a data-pull problem (classic) or a synthesis/judgment problem (AI), or to name specific tools.",
        questions: [
          {
            field: "currentTools",
            question:
              "What are the actual source systems, and do any of them have an API, or is this manual copy-paste/export?",
            why: "Determines whether this is a Power Automate/Function App data-pull job or something that needs UI automation.",
          },
          {
            field: "steps",
            question:
              "Is 'putting it into a report' mostly copying numbers into a template, or does it involve writing analysis/narrative text?",
            why: "Determines classic (template-filling) vs. AI (drafting narrative) vs. hybrid.",
          },
        ],
      },
      {
        status: "complete",
        recommendation: {
          scope: "full",
          scopeRationale:
            "At 8 hours every quarter for what's fundamentally a data-gathering-and-templating task, the whole process is worth automating rather than just a piece of it.",
          approach: "hybrid",
          approachRationale:
            "Based on your follow-up answers, most of this is pulling numbers into a template (classic), with a smaller narrative write-up piece that benefits from an AI-drafted first pass a human then edits.",
          bottleneckStepIndex: null,
          proposedFlow: [
            { label: "Function App pulls data from the source systems automatically on a quarterly schedule", kind: "automated" },
            { label: "Azure OpenAI drafts the narrative/analysis sections from the assembled data", kind: "automated" },
            { label: "You review and edit the draft before finalizing", kind: "manual" },
          ],
          recommendedTools: [
            {
              tool: "Azure Function App",
              role: "Data collection",
              rationale: "Pulls data from the source systems on a quarterly schedule and assembles the structured parts of the report.",
            },
            {
              tool: "Azure OpenAI",
              role: "Narrative drafting",
              rationale: "Drafts the analysis/narrative sections from the assembled data as a starting point for review.",
            },
          ],
          modelGuidance: {
            tierNeeded: "frontier (e.g. gpt-4o)",
            reasoning: "Drafting coherent narrative analysis benefits from stronger reasoning than a classification task would.",
            estimatedTokenCostNotes: "Only 4 runs/year — cost is a non-issue regardless of tier.",
          },
          humanInTheLoopNeeded: true,
          humanInTheLoopNotes:
            "A compliance report should always get a human review/edit pass before it's finalized, especially the AI-drafted narrative sections.",
          risks: [
            {
              risk: "This is a compliance-facing document",
              severity: "medium",
              mitigation: "Keep a human in the loop as final reviewer/approver — never auto-submit.",
            },
          ],
          estimatedBuildEffort: "days",
          roiNotes: "8 hours/quarter of stressful, deadline-driven work reclaimed, four times a year.",
          confidence: "medium",
          reasoning: "Round 2 of 2: recommendation reflects your follow-up answers about source systems and report structure.",
        },
      },
    ],
  },
  {
    label: "AI agent — POA document review",
    intake: {
      title: "Power of attorney (POA) document review",
      description:
        "When a customer wants to grant POA authority on their account, a branch employee submits a case in CRM with the POA document attached, then calls deposit operations so a specialist can review it and let the employee know if it's good to go.",
      currentTools: "CRM (case management), phone",
      steps: [
        { label: "Branch employee submits a case in CRM with the POA document attached" },
        { label: "Branch employee calls deposit ops to flag the new case" },
        { label: "Deposit ops opens the case and reviews the POA document" },
        { label: "Deposit ops adds review notes to the case" },
        { label: "Deposit ops calls or messages the branch employee with the decision" },
      ],
      frequency: "daily",
      volumePerOccurrence: "8-10 cases",
      timeSpentPerOccurrenceMinutes: 20,
      numberOfPeopleInvolved: 2,
      painPoints:
        "Deposit ops has to break from their queue for a phone call, review turnaround is slow and inconsistent depending on who's available, and there's no consistently documented reasoning behind approvals or denials.",
      variability: "some exceptions",
      dataSensitivity: "restricted",
      dataSensitivityNotes:
        "POA documents contain customer PII and the decision grants legal authority over a financial account.",
      hasApiOrIntegrationAccess: "yes",
      changeFrequency: "changes occasionally",
      urgency: "medium",
    },
    script: [
      {
        status: "complete",
        recommendation: {
          scope: "full",
          scopeRationale:
            "The whole flow — flagging the case, reviewing the document, logging notes, and notifying the employee — is a repeatable review-and-notify pattern end to end. At 8-10 cases/day x 20 minutes x 2 people, that's real daily ops time, and the phone-tag step alone disappears once the case itself can trigger the review.",
          approach: "hybrid",
          approachRationale:
            "Reviewing the POA document for validity (signatures, notarization, scope of authority, dates) is judgment over an unstructured document — a good fit for an LLM. But case intake, routing, and employee notification are deterministic and belong in classic automation. Because a POA approval grants real authority over a customer's account, this should stay hybrid rather than fully autonomous AI: the model drafts the yes/no and reasoning, a human still confirms it.",
          bottleneckStepIndex: null,
          proposedFlow: [
            { label: "Branch employee submits a case in CRM with the POA document attached", kind: "manual" },
            { label: "Azure OpenAI automatically reviews the document and drafts a yes/no with reasoning", kind: "automated" },
            { label: "Deposit ops confirms the AI's recommendation before it's finalized", kind: "manual" },
            { label: "Branch employee is automatically notified of the decision", kind: "automated" },
          ],
          recommendedTools: [
            {
              tool: "Azure Function App",
              role: "Orchestration",
              rationale:
                "Triggered on new CRM case creation via webhook/API, pulls the attached POA document, calls Azure OpenAI for review, and writes the yes/no plus reasoning back into the case notes — this is what removes the manual phone call entirely.",
            },
            {
              tool: "Azure OpenAI",
              role: "Document review & reasoning",
              rationale:
                "Reviews the POA document against validity criteria and produces a yes/no recommendation with documented reasoning — more consistent and auditable than ad hoc phone reviews, and gives deposit ops a documented starting point instead of a blank read.",
            },
            {
              tool: "Power Automate",
              role: "Employee notification",
              rationale:
                "Simple connector-based step to message the branch employee once the case is updated with a decision — no custom code needed for this part.",
            },
          ],
          modelGuidance: {
            tierNeeded: "frontier (e.g. gpt-4o)",
            reasoning:
              "Reviewing a legal/compliance-adjacent document and producing defensible reasoning is a higher-stakes judgment call than simple classification — worth the stronger reasoning tier given the cost of getting it wrong.",
            estimatedTokenCostNotes:
              "8-10 cases/day is low volume — a frontier model here is affordable even at the pricier tier, and trivial next to the risk of a bad approval.",
          },
          humanInTheLoopNeeded: true,
          humanInTheLoopNotes:
            "A POA approval grants legal authority over a customer's account, so keep deposit ops confirming the AI's recommendation — at minimum on denials and low-confidence calls — rather than auto-approving outright, and periodically audit a sample of AI-approved cases.",
          risks: [
            {
              risk: "POA documents contain PII and the decision grants account access authority",
              severity: "high",
              mitigation:
                "Use the team's own Azure OpenAI tenant (not a public endpoint), restrict document access to the Function App, and keep a human confirming before authority is granted.",
            },
            {
              risk: "The model misjudging document validity (e.g. missing a notarization requirement) could enable unauthorized account access",
              severity: "high",
              mitigation:
                "Require human-in-the-loop confirmation on approvals until the model's track record is well established, plus ongoing audit sampling after that.",
            },
          ],
          estimatedBuildEffort: "weeks",
          roiNotes:
            "8-10 cases/day x 20 minutes x 2 people is meaningful daily ops time reclaimed, plus it eliminates the phone-tag entirely and gives branch employees and customers faster, more consistent turnaround.",
          confidence: "medium",
          reasoning:
            "A real judgment task (document validity review) wrapped in a fully automatable intake/notify pipeline — but because the judgment call determines account access authority, this stays hybrid with a human confirming rather than a fully autonomous approve/deny agent.",
        },
      },
    ],
  },
  {
    label: "Branching — expense approval routing",
    intake: {
      title: "Expense report approval routing",
      description:
        "Employees submit expense reports for manager approval; what happens next depends on whether the manager approves or rejects it.",
      currentTools: "Concur, Outlook",
      steps: [
        { label: "Employee submits expense report in Concur" },
        {
          label: "Manager reviews the report",
          branches: [
            { label: "Approved", steps: ["Finance processes reimbursement"] },
            { label: "Rejected", steps: ["Employee is notified with the reason"] },
          ],
        },
        { label: "Report status is finalized in Concur" },
      ],
      frequency: "weekly",
      volumePerOccurrence: "25 reports",
      timeSpentPerOccurrenceMinutes: 8,
      numberOfPeopleInvolved: 2,
      painPoints:
        "Manager approval is a manual gate for every report regardless of size, and simple compliant reports wait in the same queue as ones that actually need scrutiny.",
      variability: "some exceptions",
      dataSensitivity: "internal",
      dataSensitivityNotes: "",
      hasApiOrIntegrationAccess: "yes",
      changeFrequency: "changes occasionally",
      urgency: "low",
    },
    script: [
      {
        status: "complete",
        recommendation: {
          scope: "full",
          scopeRationale:
            "The whole routing pattern — check against policy, approve or flag for review, notify — is well-defined and repeatable regardless of which branch a given report takes.",
          approach: "classic",
          approachRationale:
            "This is rule-based policy matching (spending limits, receipt requirements, category rules), not judgment over unstructured content — deterministic automation handles it more reliably and auditably than an AI call would.",
          bottleneckStepIndex: null,
          proposedFlow: [
            { label: "Employee submits expense report in Concur", kind: "manual" },
            { label: "Power Automate checks the report against policy rules", kind: "automated" },
            { label: "Compliant reports are auto-approved and sent to Finance for reimbursement", kind: "automated" },
            { label: "Reports outside policy are routed to the manager for review", kind: "manual" },
          ],
          recommendedTools: [
            {
              tool: "Power Automate",
              role: "Policy rule engine & routing",
              rationale:
                "Concur has a native connector, and the approval logic (amount thresholds, category rules, receipt requirements) is exactly the kind of deterministic branching Power Automate handles well without custom code.",
            },
          ],
          modelGuidance: {
            tierNeeded: "none",
            reasoning: "Policy matching is rule-based, not a judgment task — no LLM involved.",
            estimatedTokenCostNotes: "N/A",
          },
          humanInTheLoopNeeded: true,
          humanInTheLoopNotes:
            "Reports outside policy thresholds should still reach a manager for judgment — only the clearly-compliant path should auto-approve.",
          risks: [
            {
              risk: "Policy rules can have edge cases (e.g. approved exceptions) that a rigid rule engine misses",
              severity: "medium",
              mitigation: "Route anything ambiguous or borderline to the manager rather than trying to encode every exception.",
            },
          ],
          estimatedBuildEffort: "days",
          roiNotes:
            "25 reports/week x 8 minutes is modest per-report time, but the real win is compliant reports no longer waiting behind exceptions in the same manual queue.",
          confidence: "high",
          reasoning:
            "A clean rule-based routing case — the branching in the current process (approve vs. reject) maps directly onto a policy-threshold check, which is exactly what deterministic automation is for.",
        },
      },
    ],
  },
  {
    label: "Round-cap test — stays vague through 2 follow-ups",
    intake: {
      title: "Persistently ambiguous automation candidate",
      description:
        "A process that stays vague no matter how many clarifying questions are asked — used to test the follow-up round cap.",
      currentTools: "unclear",
      steps: [{ label: "unclear" }],
      frequency: "monthly",
      volumePerOccurrence: "unclear",
      timeSpentPerOccurrenceMinutes: 30,
      numberOfPeopleInvolved: 1,
      painPoints: "unclear",
      variability: "some exceptions",
      dataSensitivity: "internal",
      dataSensitivityNotes: "",
      hasApiOrIntegrationAccess: "unknown",
      changeFrequency: "changes occasionally",
      urgency: "low",
    },
    script: [
      {
        status: "needs_info",
        partialAssessment: "I don't have enough here yet to say anything meaningful — tools, steps, and volume are all unclear.",
        questions: [
          { field: "currentTools", question: "What tools are actually used today?", why: "Can't assess automation approach without knowing the current tooling." },
          { field: "steps", question: "What are the actual steps in this process?", why: "Can't identify a bottleneck or judge variability without the real flow." },
        ],
      },
      {
        status: "needs_info",
        partialAssessment:
          "Still missing the basics needed for a real recommendation — this round exists to test what happens when the gaps aren't closed by round 2.",
        questions: [
          { field: "volumePerOccurrence", question: "Roughly how much volume are we talking about each time this happens?", why: "Volume is central to whether this is worth automating at all." },
          { field: "painPoints", question: "What's actually painful about this today?", why: "Without a stated pain point, there's no way to judge ROI." },
        ],
      },
      {
        status: "complete",
        recommendation: {
          scope: "skip",
          scopeRationale:
            `This is round ${MAX_FOLLOWUP_ROUNDS + 1} — the follow-up cap has been reached. Without concrete answers across two rounds of questions, there isn't enough here to responsibly recommend automating anything, so the safe default is to hold off.`,
          approach: "classic",
          approachRationale: "N/A — insufficient information to recommend a specific approach with any confidence.",
          bottleneckStepIndex: null,
          proposedFlow: [{ label: "unclear", kind: "manual" }],
          recommendedTools: [],
          modelGuidance: { tierNeeded: "none", reasoning: "N/A", estimatedTokenCostNotes: "N/A" },
          humanInTheLoopNeeded: true,
          humanInTheLoopNotes: "Someone should manually gather the missing details (tools, steps, volume, pain points) before revisiting this as a candidate.",
          risks: [
            {
              risk: "Recommending an automation approach without knowing the actual tools/steps/volume",
              severity: "high",
              mitigation: "Re-submit with concrete details once they're known, rather than acting on this assumption-heavy pass.",
            },
          ],
          estimatedBuildEffort: "hours",
          roiNotes: "Can't be estimated without volume/time data.",
          confidence: "low",
          reasoning:
            `Round ${MAX_FOLLOWUP_ROUNDS + 1} of ${MAX_FOLLOWUP_ROUNDS + 1} (follow-up cap reached): the intake stayed underspecified after two rounds of clarifying questions, so per the cap this returns a completed-but-low-confidence result with assumptions stated rather than asking again.`,
        },
      },
    ],
  },
];

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

const FREQUENCY_PER_YEAR: Record<ProcessIntake["frequency"], number> = {
  daily: 250,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  "ad-hoc": 12,
};

function buildFallbackResponse(intake: ProcessIntake, roundNumber: number): LlmResponse {
  // A simple heuristic so freeform manual testing (not matching a named scenario)
  // still gets a plausible, non-crashing response instead of an error.
  if (roundNumber === 1 && !intake.description.trim()) {
    return {
      status: "needs_info",
      partialAssessment: "The description is empty, so there's not enough here to assess yet.",
      questions: [
        {
          field: "description",
          question: "What does this process actually do?",
          why: "Can't recommend anything without knowing what the process is for.",
        },
      ],
    };
  }

  const annualHours =
    (FREQUENCY_PER_YEAR[intake.frequency] * intake.timeSpentPerOccurrenceMinutes * intake.numberOfPeopleInvolved) / 60;

  const scope: "skip" | "partial" | "full" =
    annualHours < 10 ? "skip" : intake.variability === "highly variable" ? "partial" : "full";

  const approach: "classic" | "ai" | "hybrid" =
    intake.variability === "highly standardized"
      ? "classic"
      : intake.variability === "highly variable"
        ? "ai"
        : "hybrid";

  const recommendedTools =
    scope === "skip"
      ? []
      : approach === "classic"
        ? [
            {
              tool: intake.hasApiOrIntegrationAccess === "yes" ? "Azure Function App" : "Playwright",
              role: "Automation logic",
              rationale:
                intake.hasApiOrIntegrationAccess === "yes"
                  ? `${intake.currentTools || "the current tools"} expose an API, so this can be automated reliably against it.`
                  : `${intake.currentTools || "the current tool"} appears to be UI-only, so Playwright is the fallback — flagged as higher maintenance than an API-based option.`,
            },
          ]
        : approach === "ai"
          ? [{ tool: "Azure OpenAI", role: "Judgment step", rationale: `"${intake.painPoints}" suggests this needs interpretation an LLM is well suited for.` }]
          : [
              { tool: "Azure Function App", role: "Deterministic steps", rationale: "Handles the parts of the flow that follow fixed rules." },
              { tool: "Azure OpenAI", role: "Judgment step", rationale: "Handles the part of the flow that needs interpretation." },
            ];

  // Heuristic guess at the "middle" step — not real reasoning about which step is actually the bottleneck.
  const bottleneckStepIndex = scope === "partial" && intake.steps.length > 0 ? Math.floor(intake.steps.length / 2) : null;

  const proposedFlow: ProposedFlowStep[] =
    scope === "skip"
      ? intake.steps.map((step) => ({ label: step.label, kind: "manual" as const }))
      : scope === "partial"
        ? intake.steps.map((step, i) => ({
            label:
              i === bottleneckStepIndex
                ? `${approach === "ai" ? "Azure OpenAI" : "System"} automatically handles: ${step.label}`
                : step.label,
            kind: i === bottleneckStepIndex ? ("automated" as const) : ("manual" as const),
          }))
        : intake.steps.map((step, i) => ({
            label: step.label,
            // For a full-scope hybrid guess, alternate automated/manual as a rough placeholder — not real per-step analysis.
            kind: approach === "hybrid" ? (i % 2 === 0 ? ("automated" as const) : ("manual" as const)) : ("automated" as const),
          }));

  return {
    status: "complete",
    recommendation: {
      scope,
      scopeRationale: `[MOCK fallback] Estimated ${Math.round(annualHours)} hours/year for "${intake.title || "this process"}"; variability is "${intake.variability}".`,
      approach,
      approachRationale: `[MOCK fallback] Derived from the variability field ("${intake.variability}") — this scenario title didn't match a scripted sample, so this is a generic heuristic response, not real reasoning.`,
      bottleneckStepIndex,
      proposedFlow,
      recommendedTools,
      modelGuidance:
        approach === "classic"
          ? { tierNeeded: "none", reasoning: "Classic approach — no model needed.", estimatedTokenCostNotes: "N/A" }
          : {
              tierNeeded: "small/cheap (e.g. gpt-4o-mini)",
              reasoning: "[MOCK fallback] Default guidance — not based on real task-complexity analysis.",
              estimatedTokenCostNotes: "[MOCK fallback] Not calculated.",
            },
      humanInTheLoopNeeded: intake.dataSensitivity === "confidential" || intake.dataSensitivity === "restricted",
      humanInTheLoopNotes:
        intake.dataSensitivity === "confidential" || intake.dataSensitivity === "restricted"
          ? `Data sensitivity is "${intake.dataSensitivity}" — keep a human reviewing outputs.`
          : "Not flagged as needed by this heuristic.",
      risks: [],
      estimatedBuildEffort: "days",
      roiNotes: `[MOCK fallback] ~${Math.round(annualHours)} hours/year estimated from your frequency/time/people inputs.`,
      confidence: "low",
      reasoning:
        `This submission ("${intake.title || "untitled"}") didn't match any scripted sample scenario, so this is a generic heuristic fallback, not a real recommendation — use one of the sample scenarios for a fully worked example.`,
    },
  };
}

export function getMockRecommendation(intake: ProcessIntake, conversation: FollowupRound[]): LlmResponse {
  const roundNumber = conversation.length + 1;
  const scenario = SAMPLE_SCENARIOS.find((s) => normalizeTitle(s.intake.title) === normalizeTitle(intake.title));

  if (!scenario) {
    return tagged(buildFallbackResponse(intake, roundNumber));
  }

  const index = Math.min(roundNumber, scenario.script.length) - 1;
  return tagged(scenario.script[index]);
}
