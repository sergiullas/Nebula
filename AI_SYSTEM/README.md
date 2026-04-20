# AI_SYSTEM — Operating Layer

## Purpose

This folder defines how the Cloud Brokerage Portal is built and how AI tools and developers must behave.

It exists to:

- prevent context loss
- prevent implementation drift
- ensure consistent decision-making across the system
- align architecture, UX, and execution

This is not a feature folder.  
This is the system operating layer.

---

## Files in this Folder

### AGENTS.md

Defines the implementation contract.

Includes:

- behavior rules for AI and developers
- workflow (Research → Plan → Implement)
- scope control
- system constraints (governance, explainability, execution)

This is the **primary enforcement layer**.

---

### ROADMAP_STATE.md

Defines the current system state.

Includes:

- phase status
- gaps and risks
- current priorities
- next actions

This is the **alignment layer**.

Important:

This file is NOT an implementation spec.  
It provides context, not instructions.

---

## Required Reading Order

Before starting any implementation:

1. README.md  
2. AGENTS.md  
3. ROADMAP_STATE.md  
4. Active phase or feature specification  

Do not start coding before completing this sequence.

---

## Required Workflow

All work must follow:

### 1. Research
- Read only relevant files
- Explain current behavior before proposing changes

### 2. Plan
- Write a step-by-step implementation plan in markdown
- No code at this stage

### 3. Implement
- Begin coding only after approval
- Follow AGENTS.md rules strictly

---

## Authority Model

- Feature specifications define implementation details
- AGENTS.md defines behavior and constraints
- ROADMAP_STATE.md defines system direction

If conflicts exist:

1. Specs override implementation details  
2. AGENTS.md overrides behavior  
3. ROADMAP_STATE.md guides decisions  

---

## What This Folder Does NOT Do

This folder does NOT:

- define UI design
- contain feature specs
- replace phase instructions
- include implementation code

---

## Operating Principle

AI advises. Humans decide. System executes.

---

## Final Rule

Clarity, governance, and trust take priority over speed.

The system must remain:

- predictable
- explainable
- consistent
- aligned with architecture
