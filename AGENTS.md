# AGENTS.md

Operational guide for `@askrjs/i18n`, which owns typed, application-scoped
internationalization without process-global locale policy.

## Askr North Star

Keep locale selection, catalog lookup, formatting, hydration, and direction
changes explicit and narratable. Reject invalid locale state, message contracts,
and hydration data at their boundary with corrective errors. Test every new
primitive's missing-message, invalid-input, and lifecycle failure modes. Preserve
the seam between package mechanics and application-owned locale policy. Prefer
explicit catalogs and scopes over discovery or global registration, and add no
new surface without a demonstrated application need.

Run `npm run check` before declaring a change ready.

## Optimization Gate

A benchmark number is only half of an optimization's success criterion. The
change must also preserve a causal path that a human or agent can narrate in one
sentence.

Every benchmark-driven change must include:

1. the one-sentence causal description of the optimized path;
2. the exact fallback trigger and proof that optimized and fallback paths have
   identical observable behavior and error surfaces;
3. an explicit legibility-cost statement, including `none` when no new path or
   concept is introduced; and
4. evidence that a measured bottleneck in a real application justifies the
   optimization now.

Prefer making the existing single path faster. New caches, inference,
memoization, shortcuts, fast paths, or scheduler states require an explicit
legibility decision; a speedup alone does not justify them.
