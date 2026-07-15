---
auto_execution_mode: 0
description: Keep project documentation aligned with material feature and flow changes
---

Use this workflow after a feature implementation, architecture change, or significant bug fix.

1. Review the actual code path and identify material changes to feature flow, API requests or responses, database schema, routes, permissions, environment configuration, or frontend-backend integration.
2. Update only the relevant files in `docs/`:
   - `BACKEND_STRUCTURE.md` for backend modules, layers, middleware, and runtime flow.
   - `FRONTEND_STRUCTURE.md` for routes, hooks, client state, and UI flow.
   - `API_REFERENCE.md` for endpoints, request parameters, response contracts, and permissions.
   - `DATABASE_SCHEMA.md` for persisted schema or relationship changes.
   - `INTEGRATION_GUIDE.md` for cross-layer behavior, auth, organization context, caching, and error handling.
3. Keep updates concise and operational. Document contracts, decisions, constraints, and known limitations; do not duplicate source code or generate change logs.
4. Do not update `docs/` for cosmetic-only changes or isolated internal refactors with no material behavior change.
5. Before finishing, verify documentation does not contradict the implemented code and run `git diff --check`.
