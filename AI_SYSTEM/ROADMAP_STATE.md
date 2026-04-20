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

## Usage Rule

This document is required context for:

- Architect
- PO / UX Advisor
- AI-dev-team (when reasoning about system behavior)

This document is NOT a source of implementation details.

Feature specifications and phase instructions take precedence for coding.

If a conflict exists:

- Specs define implementation
- This document defines system direction

---

## 1. Status Legend

- ❌ Not started  
- ⚠️ Partial (implemented but not compliant)  
- ✅ Strong (aligned and usable)  
- 🟢 Complete (fully aligned with phase intent)

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

### Phase 0 — Foundation

Status: 🟢 Complete

---

### Phase 1 — Insight Layer

Status: ✅ Strong

---

### Phase 2 — Action Layer

Status: ⚠️ Partial

Gaps:

- Outcome feedback not fully standardized across all actions  
- Some action behaviors still inconsistent at edges  

Risks:

- Actions may feel uneven across entry points  

---

### Phase 2.1 / 2.1A — AI Companion

Status: ⚠️ Partial

What exists:

- Right-edge drawer  
- Context-aware prompts  
- User-invoked interaction  

Gaps:

- Responses not structured (Diagnosis / Likely cause / Next step)  
- Tone still partially chat-like  
- Separation between AI guidance and execution not fully enforced  

Risks:

- Trust erosion due to inconsistent AI output  
- Drift toward generic chatbot experience  

---

### Phase 3 — Execution Layer

Status: 🟢 Complete

What exists:

- Centralized execution dispatcher  
- Shared confirmation model  
- Standardized action payloads  
- Navigation vs execution separation  
- Global action log (decision trace)  

Notes:

- This is the system backbone  
- All execution must route through this layer  

---

### Phase 3.5 — UI Alignment

Status: 🟢 Complete

What exists:

- Backstage-aligned information architecture  
- Simplified navigation model  
- Consistent UI patterns across system  

Rule:

- UI is considered stable  
- No structural UI redesign should occur  
- Focus shifts to behavioral integration  

---

### Phase 4 — Catalog & Governed Provisioning

Status: ✅ Strong

What exists:

- App-scoped catalog  
- Provider-scoped services  
- Decision-first service cards  
- Governance-aware provisioning flows  
- Confirmation and outcome states  

Gaps:

- Service detail explainability still limited  
- Post-provision traceability incomplete  
- Service lineage not visible  

Risks:

- Reduced trust if reasoning is not inspectable  
- Weak feedback loop after provisioning  

---

### Phase 4A — Templates (Behavioral Integration Layer)

Status: 🚧 In Progress

What exists:

- Template listing and detail flows  
- Governance and cost visibility  
- Template execution via dispatcher  
- Basic Services integration  

Gaps:

1. Templates are not yet the default decision path  
2. Weak linkage between templates and Services tab  
3. No clear lineage (template → services → application)  
4. Post-provision visibility is insufficient  
5. Template prioritization is shallow  

Risks:

- Templates remain a parallel system instead of core flow  
- Marketplace drift  
- Loss of system coherence  

---

### Phase 5 — AI Behavior Layer

Status: ❌ Blocked

Rule:

- Do not begin Phase 5 until Phase 4A is complete  

---

## 4. Cross-Phase Gaps (System-Level)

1. AI companion not aligned with execution model  
2. Template → Service → Application lineage not visible  
3. Post-execution clarity is weak  
4. Execution trace exists but not fully surfaced in UX  
5. Templates not yet the dominant decision path  

---

## 5. Prototype Fidelity Rule

We implement only enough depth to:

1. Demonstrate decision flow  
2. Demonstrate governance behavior  
3. Demonstrate execution outcome  

We do NOT implement:

- full backend logic  
- exhaustive configuration  
- production-grade edge cases  

---

## 6. Current Priority (Locked)

Focus on system convergence.

1. Integrate templates into core system behavior (Phase 4A)  
2. Align AI companion with structured responses (Phase 2.1A)  
3. Strengthen execution visibility (traceability + lineage)  
4. Ensure templates drive decision → execution → outcome flow  

Do NOT move to Phase 5 yet.

---

## 7. Next Actions

1. Implement Phase 4A Templates Integration  
2. Introduce template → services lineage  
3. Improve post-provision visibility in Services tab  
4. Align AI companion response structure  
5. Strengthen action log visibility and meaning  

---

## End of Document
