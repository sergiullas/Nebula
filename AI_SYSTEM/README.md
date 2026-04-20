# AI System Folder

## Purpose

This folder contains the operating context and implementation rules for the Cloud Brokerage Portal project.

It exists to reduce context loss, prevent implementation drift, and ensure that both human developers and AI coding tools follow the same project rules before writing code.

## Required Reading Order

Before starting any implementation work, read these files in order:

1. `README.md`
2. `AGENTS.md`
3. `STATE.md`
4. The active phase or feature specification document

Do not start coding before completing this reading sequence.

## Required Workflow

All implementation work must follow this workflow:

1. Research
   - Read only the files relevant to the task
   - Explain the current logic back before proposing changes

2. Plan
   - Write a step-by-step implementation plan in markdown
   - Do not write code yet

3. Implement
   - Only begin coding after the plan is reviewed and approved

## Non-Negotiable Rules

1. AI advises. Humans decide.
2. Do not expand scope beyond the active phase or task.
3. Do not invent new product concepts, actions, or flows unless explicitly approved.
4. Do not hide governance, remove human control, or introduce opaque AI behavior.
5. Preserve accessibility, explainability, and context visibility.
6. Use project rules and phase specs as the source of truth.

## Notes

This folder is the project operating layer.
It does not replace feature specifications.
It ensures that implementation stays aligned with the architecture, design philosophy, and current project state.
