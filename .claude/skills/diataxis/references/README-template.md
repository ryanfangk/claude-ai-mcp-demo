# Documentation

This project uses the [Diataxis framework](https://diataxis.fr/) to organize documentation into four types based on what the reader needs.

```
                    │
      Learning      │      Working
                    │
  ┌─────────────────┼─────────────────┐
  │                 │                 │
  │   TUTORIAL      │    HOW-TO       │
  │                 │    GUIDE        │  Practical
  │   (learning     │    (task        │  (doing)
  │    by doing)    │    completion)  │
  │                 │                 │
  ├─────────────────┼─────────────────┤
  │                 │                 │
  │   EXPLANATION   │    REFERENCE    │
  │                 │                 │  Theoretical
  │   (understanding│    (information │  (knowing)
  │    why)         │     lookup)     │
  │                 │                 │
  └─────────────────┼─────────────────┘
                    │
```

## Categories

### `tutorial/` — Learning-oriented
Walk a beginner through steps to a first success. The reader learns by doing.

*Examples: Getting started guide, onboarding walkthrough, "Build your first X"*

### `how-to/` — Task-oriented
Show how to solve a specific problem. The reader already has context and needs steps.

*Examples: Migration guide, deployment runbook, troubleshooting guide*

### `reference/` — Information-oriented
Describe what something is, structured for lookup. Dry, accurate, complete.

*Examples: API docs, config schema, environment variables, CLI flags, changelog*

### `explanation/` — Understanding-oriented
Help the reader understand *why* something is the way it is. Context, rationale, trade-offs.

*Examples: Architecture decisions, design rationale, "Why we chose X", system overview*

## Classifying a Document

Ask two questions:

1. **Practical or theoretical?** Will the reader DO something or KNOW something?
2. **Learning or working?** Building new understanding or applying existing knowledge?

| | Learning | Working |
|--|---------|---------|
| **Practical** | Tutorial | How-To |
| **Theoretical** | Explanation | Reference |

When a document fits multiple categories, classify by its **primary purpose**.
