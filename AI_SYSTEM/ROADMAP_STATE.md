# Phase Roadmap and System State

## 0. Purpose

This document is the single source of truth for the current state of the Cloud Brokerage Portal.

It answers:

1. Where the system is today
2. What is implemented vs incomplete
3. What gaps exist per phase
4. What risks exist
5. What should be done next

This document does NOT contain implementation details.
It is used by the Architect, PO/UX Advisor, and AI-dev-team to stay aligned.

---

## 1. Status Legend

* ❌ Not started
* ⚠️ Partial (implemented but not compliant)
* ✅ Strong (aligned and usable)
* 🟢 Complete (fully aligned with phase intent)

---

## 2. System Overview

Core Model:

Application → Services → Catalog → Decision → Provision → Outcome

Core Rules:

1. Decision-first, not configuration-first
2. Context must always be visible (application + provider)
3. Governance must be explicit and explainable
4. AI advises, humans decide, system executes

---

## 3. Phase Status

---

## Phase 0 — Foundation

Status: 🟢 Complete

What exists:

1. Custom application shell
2. My Applications view
3. Application workspace
4. Routing and provider awareness

Gaps:

* None significant

Risks:

* None

---

## Phase 1 — Insight Layer

Status: ✅ Strong

What exists:

1. Incident detection on application cards
2. Metrics and logs
3. Incident banner
4. AI summary at app level
5. Recommended next action (rollback)

Gaps:

1. AI interpretation not fully embedded inside Logs & Metrics view
2. Logs and metrics separation weakens evidence + interpretation model
3. Deployments tab underdeveloped

Risks:

1. Users may rely on overview instead of evidence
2. Weak inspection path reduces trust in AI

---

## Phase 2 — Action Layer

Status: ⚠️ Partial

What exists:

1. Rollback action
2. Confirmation interaction
3. UI state updates after action

Gaps:

1. Action behavior not consistent across system
2. Outcome feedback not standardized

Risks:

1. Actions may feel disconnected
2. System does not yet feel deterministic

---

## Phase 2.1 — AI Companion

Status: ⚠️ Partial

What exists:

1. Right-edge drawer
2. User-invoked interaction
3. Context-aware prompts
4. Basic AI responses

Gaps:

1. Responses not structured (Diagnosis / Likely cause / Next step)
2. Feels too chat-like
3. Prompt hierarchy not fully guiding behavior

Risks:

1. Trust erosion due to inconsistent AI output
2. Drift toward generic chatbot experience

---

## Phase 2.1A — AI Refinement

Status: ⚠️ Partial

What exists:

1. State-aware prompts
2. Controlled interaction model

Gaps:

1. Structured response format not enforced
2. Tone not fully aligned with enterprise context
3. Separation of concerns (AI vs actions) is inconsistent

Risks:

1. AI begins to compete with execution layer
2. Loss of clarity in decision flow

---

## Phase 3 — Execution Layer

Status: ⚠️ Partial

What exists:

1. Command palette (Cmd+K)
2. Shared action vocabulary (partial)
3. Confirmation interactions
4. Basic action tracking (local state)

Gaps:

1. No single reusable confirmation component
2. No unified execution flow across entry points
3. No visible recent action log
4. Command palette and workspace actions not fully aligned

Risks:

1. Multiple execution patterns confuse users
2. Loss of accountability and traceability

---

## Phase 4 — Catalog & Governed Provisioning

Status: ✅ Strong

What exists:

1. Services tab entry
2. App-scoped catalog
3. Provider-scoped services
4. Service cards (fit, governance, cost)
5. Service detail page
6. Governance-aware provisioning flows
7. Confirmation and outcome states

Gaps:

1. Global catalog route inconsistent or incomplete
2. Post-provision traceability limited
3. Service lineage not visible

Risks:

1. Confusion between global vs app-scoped entry
2. Reduced trust due to lack of history and lineage

---

## Phase 4A — Templates (Decision Accelerators)

Status: ⚠️ Strong UI, Partial Integration

What exists:

1. Template listing and cards
2. Template detail flow (inspect → configure → review → done)
3. Governance visibility at template level
4. Included services explanation
5. Cost estimation
6. Policy constraints

Gaps:

1. Templates not clearly the default entry path
2. Not fully app-scoped in behavior
3. No strong prioritization (best match vs alternatives)
4. Weak connection to Services tab after provisioning
5. No lineage (template → services relationship not visible)
6. No unified execution integration with Phase 3

Risks:

1. Templates become parallel system instead of core flow
2. Marketplace drift (detached experience)
3. Loss of system coherence

---

## Phase 5 — AI Behavior Layer

Status: ❌ Not Started

Planned capabilities:

1. Recommendation ranking
2. Trade-off explanation
3. Cross-signal reasoning (cost, performance, policy)
4. Optimization insights

Risks:

1. Premature implementation may destabilize earlier phases

---

## 4. Cross-Phase Gaps (System-Level)

1. No unified execution model
2. No unified confirmation system
3. No visible system-wide action log
4. No clear lineage (who did what, via which path)
5. AI behavior inconsistent across contexts
6. Templates not fully integrated into core model

---

## 5. Prototype Fidelity Rule

We implement only enough depth to:

1. Demonstrate decision flow
2. Demonstrate governance behavior
3. Demonstrate execution outcome

We do NOT implement:

* full backend logic
* exhaustive configuration
* production-grade edge cases

---

## 6. Current Priority (Architect Recommendation)

Do NOT move to Phase 5 yet.

Focus on convergence:

1. Unify execution model (Phase 3)
2. Standardize AI response structure (Phase 2.1A)
3. Integrate templates into system (Phase 4A)
4. Add traceability (action log + lineage)

---

## 7. Next Actions

1. Create Phase 4A Templates instructions document
2. Create Phase 3 convergence delta spec
3. Update AI companion to structured responses
4. Introduce system-wide action log

---

## End of Document
