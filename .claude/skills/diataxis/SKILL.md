---
name: diataxis
description: >
  Bootstrap a Diataxis documentation structure in any project.
  Use when setting up docs from scratch, initializing a docs/ folder,
  or when a project needs the standard Diataxis directory layout.
  Command: /diataxis scaffold
---

# Diataxis

Bootstrap project documentation into a clear, navigable structure using the Diataxis framework.

## Sub-Command

| Command | Purpose | Reference |
| ------- | ------- | --------- |
| `/diataxis scaffold` | Build the Diataxis directory structure (idempotent) | [scaffold-subcommand.md](references/scaffold-subcommand.md) |

## Before Running

1. **Read** `CLAUDE.md` — Project conventions and structure
2. **Read** [references/diataxis-framework.md](references/diataxis-framework.md) — Diataxis categories and directory conventions
3. **Scan** `docs/` — Current documentation tree and file layout

## The Diataxis Framework

Four documentation types along two axes — practical vs. theoretical, learning vs. working:

| Category | Purpose | Directory |
| -------- | ------- | --------- |
| **Tutorial** | Learning-oriented | `docs/tutorial/` |
| **How-To** | Task-oriented | `docs/how-to/` |
| **Reference** | Information-oriented | `docs/reference/` |
| **Explanation** | Understanding-oriented | `docs/explanation/` |

**Read** [references/diataxis-framework.md](references/diataxis-framework.md) for full classification rules and key principles.
