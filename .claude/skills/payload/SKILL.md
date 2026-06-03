---
name: payload
description: Use when working with Payload CMS projects (payload.config.ts, collections, fields, hooks, access control, Payload API). Use when debugging validation errors, security issues, relationship queries, transactions, or hook behavior.
---

# Payload CMS Application Development

Canonical reference for this project's Payload CMS conventions lives at:

- [docs/reference/docs/payload/README.md](../../../docs/reference/docs/payload/README.md) — Quick-reference table, essential patterns, security pitfalls, project structure
- [docs/reference/docs/payload/reference/](../../../docs/reference/docs/payload/reference/) — Deep-dive topic files (FIELDS, COLLECTIONS, HOOKS, ACCESS-CONTROL, QUERIES, ADAPTERS, ENDPOINTS, ADVANCED, PLUGIN-DEVELOPMENT, FIELD-TYPE-GUARDS)

Project-specific overrides on top of vanilla Payload conventions live in [.claude/rules/payload-conventions.md](../../rules/payload-conventions.md) — the rules file takes precedence whenever it conflicts with the generic reference.

## When to use

- Designing or modifying a collection (`collections/*.ts`, `payload.config.ts`)
- Authoring or debugging hooks, access functions, validate functions
- Writing Local API queries, custom endpoints, or background jobs
- Diagnosing transaction, relationship, or draft/publish behavior
- Adding a storage adapter, plugin, or localization config

## How to use

1. Start at [the README](../../../docs/reference/docs/payload/README.md)'s Quick Reference table — it maps tasks to the specific section that covers them.
2. Read [.claude/rules/payload-conventions.md](../../rules/payload-conventions.md) for the project's deviations (Local API access control defaults, MCP scope limits, validate-message discipline, Vercel Blob immutability, etc.).
3. Cross-check the [data modeling rules](../../rules/data-modeling.md) when the change touches schema, migrations, or external IDs.
