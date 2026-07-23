# Agent-ready ticket standard

A ticket is agent-ready when an executor agent (or a new joiner) can pick it up cold — no
meeting history, no Slack archaeology, no "ask the one person who knows". The ticket **is**
the brief: it maps
1:1 onto the executor agent's contract (goal, constraints, done-criteria, the why).

## Checklist

A ticket passes only if every item holds:

1. **Self-contained context.** A `# Context` section that explains what this is and why,
   without requiring the reader to have attended anything. Named decisions are cited inline
   with their source ("draft-first decision, <meeting/date>", "contract: PR #10").
2. **Exact entry points.** Repo names, file paths, module names — `src/lib/rate-limit.ts`,
   not "the rate limiter". If the work extends a pattern, point at the pattern's exemplar.
3. **The contract it builds against.** Link the OpenAPI spec, tool schema, golden dataset,
   or design doc. If a dependent ticket defines the contract, the `blockedBy` relation must
   exist — an agent must never guess an interface.
4. **Verifiable done-criteria.** Acceptance criteria an agent can check itself: named test
   commands, spec-lint passes, golden-set runs, observable behaviours. "Works correctly" and
   empty AC templates fail the lint.
5. **Real dependency relations.** Sequencing as `blockedBy`/`blocks`, never prose ("waits on
   3722" in a description does not count).
6. **One reviewable unit, sized.** Scoped to a single coherent PR and estimated on the
   XS/S/M scale (XS = 0.5 day, S = 1 day, M = up to 3 days). Bigger than M, or needing two
   PRs → split into chained tickets. A missing estimate is FIXABLE, not BLOCKED: the
   linter proposes a size with reasoning, calibrated against comparable sized tickets on
   the team, and applies it on human approval. Canonical numeric mapping for Linear's
   estimate field: XS = 1, S = 2, M = 3 (the day values — 0.5 / 1 / up to 3 — live in the
   scale definition, not the field).
7. **Out-of-scope fence.** What the agent must NOT touch, so it doesn't wander (adjacent
   refactors, other flags, UI polish).
8. **Verification step.** How the agent proves completion before reporting done — the exact
   commands/checks, so a verifier pass can attempt to refute it.

## Routing labels

- `agent:mech` — fully specified, no design decisions remain (pattern duplication, renames,
  flag removals, convention-following tests). Route to the mechanical executor tier.
- `agent:judgment` — local design decisions within a clear brief (features, integration
  work). Route to the judgment executor tier; verifier pass mandatory.
- `human` — creates a pattern others will follow (skeletons, transport layers), or touches a
  human-gate area: authentication/authorisation, personal or learner data handling,
  spend-bearing integrations, destructive migrations, anything under an open privacy action.
  Agents may draft, humans decide and merge.

## Template

```markdown
# Context

<What this is, why it exists, named decisions with sources. Standalone.>

Contract: <link to spec / schema / goldens / exemplar pattern>
Entry points: <repo, paths>

# To Do

- [ ] <concrete step>
- [ ] <concrete step>

# Acceptance criteria (machine-checkable)

1. <command or check> passes
2. <observable behaviour>

# Verification

Run: <exact commands>. Expected: <results>.

# Out of scope

- <fence>
```

## Lint verdicts

When auditing an existing ticket, return one of:

- **READY** — passes all eight checks; assign routing label.
- **FIXABLE** — the context exists but isn't written down. Draft the missing sections
  **only from source the user provides or points you to** (spec, ADR, design doc, exemplar
  code, the implementation being ported) or that you can read in-repo — **never fabricate
  it**. If the substance can't be sourced, downgrade to BLOCKED. Present for approval; never
  auto-edit an actively-curated board.
- **BLOCKED** — the contract or a decision doesn't exist yet; name what must be decided,
  by whom, and link the blocking ticket.
