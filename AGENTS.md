# NOBU: Saviour Dog

A PS1-era-style 3D platformer in Three.js with no engine. `README.md` describes the levels, bosses and
controls.

- `vendor/hub-sdk` comes from `metaverse-hub`. Follow `vendor/hub-sdk/VENDOR.md` to update it.

## Checks

```bash
npm test
npm run build
```

## Art generation

Follow `docs/higgsfield-workflow-guide.md`. This repo uses the **rigged 3D character** workflow. If the owner says to skip approvals, follow that section of the guide.

## Working with other agents

Claude Code, Codex, Cursor and Grok Bot all work on this repo.

- Start each task on its own branch from the latest `main`, named `<agent>/<slug>`. Never push to
  `main`; open a pull request.
- On the owner's machine, `agent-task new nobu <slug> --agent <name>` creates that branch in its own
  worktree.
- Don't edit files that another active task is changing.
- Run the checks before opening a pull request, and report any you could not run.
- A different agent reviews the work: `agent-task review <path>`, or `/codex:adversarial-review` in
  Claude Code.
