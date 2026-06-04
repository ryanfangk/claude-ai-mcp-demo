# The Diataxis Framework

*Source: [diataxis.fr](https://diataxis.fr/)*

Four documentation types along two axes — **practical vs. theoretical** and **learning vs. working**:

| Category | Purpose | Test Question |
| -------- | ------- | ------------- |
| **Tutorial** | Learning-oriented | Does this guide a beginner through steps to a first success? |
| **How-To Guide** | Task-oriented | Does this show how to solve a specific, real-world problem? |
| **Reference** | Information-oriented | Does this describe what something is, structured for lookup? |
| **Explanation** | Understanding-oriented | Does this help the reader understand *why* something is the way it is? |

## Directory Convention

```
docs/
├── tutorial/     # Learning-oriented
├── how-to/        # Task-oriented
├── reference/     # Information-oriented
└── explanation/   # Understanding-oriented
```

## The Compass

Two questions locate any document:

1. **Practical or theoretical?** Will the reader DO something or KNOW something?
2. **Learning or working?** Building new understanding or applying existing knowledge?

| | Learning | Working |
|--|---------|---------|
| **Practical** | Tutorial | How-To Guide |
| **Theoretical** | Explanation | Reference |

## Classification

When a document fits multiple categories, classify by **primary purpose**. If still ambiguous, ask: who is the reader and what do they need right now?

| Document | Category | Why |
|----------|----------|-----|
| Getting started guide | **Tutorial** | Teaches a beginner by doing |
| "How to configure SSO" | **How-To** | Solves a specific task |
| API endpoint documentation | **Reference** | Structured for lookup |
| "Why we chose PostgreSQL" | **Explanation** | Explains reasoning and trade-offs |
| Deployment runbook | **How-To** | Step-by-step for a specific task |
| Database schema | **Reference** | Dry description for lookup |
| Architecture overview | **Explanation** | How the system fits together |
| "How authentication works" | **Explanation** | Explains the system, not steps for a task |
| Troubleshooting guide | **How-To** | Solving specific problems |

### Common misclassifications

| Document | Feels like... | Actually is... |
|----------|--------------|----------------|
| "How auth works" | How-To | **Explanation** — explains, doesn't instruct |
| "API ref with examples" | Tutorial | **Reference** — examples illustrate, don't teach |
| "Setting up CI/CD" | Tutorial | **How-To** — specific task, not learning exercise |
| "Why we use Postgres" | Reference | **Explanation** — reasoning, not specs |
| "Database schema" | Explanation | **Reference** — structured for lookup, not rationale |
| "First deploy to prod" | How-To | **Tutorial** — teaching a beginner |

### More examples by category

**Tutorial:** Getting started guide, onboarding walkthrough, "Build your first X", first-time setup exercise

**How-To:** Migration guide (v1 → v2), deployment runbook, "How to add a new API endpoint", troubleshooting guide, recovery playbook, "How to configure SSO"

**Reference:** API docs, config schema, environment variables list, database schema, CLI flags, changelog, roadmap, glossary, data dictionary

**Explanation:** ADRs, design rationale, "Why we chose X over Y", architecture overview, trade-off analyses, post-mortems, "How authentication works"
