# `/diataxis scaffold`

Create the Diataxis directory structure with a README explaining the framework. Idempotent — safe to run multiple times; existing files are never overwritten.

## When to Use

- First-time Diataxis adoption
- After cloning a repo that doesn't have a `docs/` layout
- User says "set up the docs folder", "initialize documentation"

## What It Creates

```
docs/
├── tutorial/          # Learning-oriented
├── how-to/             # Task-oriented
├── reference/          # Information-oriented
├── explanation/        # Understanding-oriented
└── README.md           # Explains the Diataxis framework and how to use it
```

## Steps

1. **Check for existing structure** — scan what already exists under `docs/`.

2. **Create missing directories:**
   ```bash
   mkdir -p docs/tutorial docs/how-to docs/reference docs/explanation
   ```
   Only create what's missing. Never remove or rename existing directories.

3. **Create `docs/README.md`** if it doesn't exist.

   Copy the contents of [README-template.md](README-template.md) into `docs/README.md`.

   **Never overwrite an existing `docs/README.md`.**

4. **No inbox or archive folders.** If a doc is unsorted, decide its category when you create it. If a doc is retired, delete it or mark it with a note at the top — git preserves the history.

5. **Don't touch non-Diataxis directories.** Projects may have additional directories outside Diataxis (e.g., `planning/`, `roadmap/`). Do NOT reorganize files into or out of non-Diataxis directories unless explicitly asked.

6. **Output report:**
   ```
   Scaffold complete
   =================
   Created directories: docs/tutorial/, docs/how-to/
   Created files: docs/README.md
   Already existed (skipped): docs/reference/, docs/explanation/
   ```
