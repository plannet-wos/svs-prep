# SvS Preparation

A planning tool for **Whiteout Survival** Survivor vs Survivor (SvS) events. Built with Angular +
Angular Material + Firebase Hosting/Firestore.

Live: **https://svs-prep.web.app**
Part of the [plannet-wos](https://github.com/plannet-wos) suite.

## What's here

The SvS prep sign-up survey — previously a Google Form, manually exported to Excel and fed into a
Python assignment script (see `Documents/SVS/WORKFLOW.md`) — ported to an in-app Angular form that
writes straight to Firestore. One submission doc per (round, player ID) pair
(`svs_submissions/{formId}_{playerId}`); a resubmission for the same round shows a diff of what
changed and asks for confirmation before overwriting.

**Appointment assignment:** the Python script's assignment algorithm is now ported in-app too (see
`core/algorithms/assignment.ts`). For each buff day (Construction/Research/Training) independently,
it matches players to one of their own selected 30-min slots using player-proposing Gale-Shapley
deferred acceptance, prioritized by that day's speedup-days: a player only ever proposes to slots
they picked, and a slot always keeps its highest-priority proposer, bumping anyone lower to their
next selected slot. That guarantees nobody is ever assigned outside their own selection, higher
speedup-days always wins a contested slot, and the number of slots filled is the maximum achievable
without breaking that priority rule. It's recomputed from scratch — cheap at this scale, and it
sidesteps incremental bump-chain bugs — after every submission and via an admin "Recompute
assignments" button, and saved to `svs_assignments/{formId}`. The public, no-login `/assignments/:id`
page shows the live schedule for a round, updating in real time as other players submit or get moved.

**Per-round config:** each SvS round is now an **SvS prep form** (`svs_forms/{id}`) — battle date,
highest FC level unlocked, Construction/Research/Training days, and the submission open/close
window — created and edited from the admin pages (the small admin icon, top right) instead of
editing `svs-round.config.ts` and redeploying. That file now only holds the options that don't
change per round (participation/Ultra Value Card choices). The public survey always shows whichever
form's submission window currently contains "now"; with none open it shows a "no round open"
message instead.

**Admin login:** superadmin-only, reusing the shared `accounts` collection / client-side
password-hash-verifying-write scheme from foundry-planner and alliance-wiki (see
`core/services/auth.service.ts` and `core/utils/password.util.ts`) — an existing superadmin account
from either of those apps works here too. As with every other collection in this shared project,
Firestore rules only check document shape, not who's writing — the admin pages are a client-side
gate, not real access control (see `firestore.rules` in the plannet-wos repo).

## Setup

```bash
npm install
npm start
```

Then open `http://localhost:4200/`. To run multiple apps side-by-side, override the port with `npm start -- --port 4XXX`.

## Firebase config

This app uses Firebase Hosting and Firestore (`tal-coordinator` project, shared with the other
plannet-wos apps). The Firebase web API key in `src/environments/environment.ts` is intentionally
checked in — [Firebase web API keys are designed to be public](https://firebase.google.com/docs/projects/api-keys);
security is enforced by `firestore.rules`, not the key.

Firestore rules for the shared `tal-coordinator` project (foundry-planner, alliance-wiki, this
app's `svs_submissions`/`svs_assignments`, and battle-calculator's `saves`) live in the
**plannet-wos** repo, not here — that's the sole owner/deployer, see its README. This repo has no
`firestore.rules` and no `"firestore"` key in `firebase.json`, so `firebase deploy` here only ever
touches hosting.

## Deploying

Every push to `main` auto-deploys to Firebase Hosting via `.github/workflows/deploy.yml` (build,
then `FirebaseExtended/action-hosting-deploy`) — no manual `firebase deploy` needed. That workflow
authenticates with a `FIREBASE_SERVICE_ACCOUNT` repo secret (a Firebase Hosting-scoped service
account key for `tal-coordinator`); rotate or replace it from the Firebase console under **Project
settings → Service accounts** if it's ever revoked.

## Contributing

Fork the repo, create a branch, open a PR. No write access needed.

<details>
<summary>Angular CLI commands</summary>

```bash
ng generate component component-name   # scaffold a component
ng build                                # production build into dist/
ng test                                 # run Vitest unit tests
```

For more, see the [Angular CLI reference](https://angular.dev/tools/cli).

</details>
