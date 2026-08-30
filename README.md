# SvS Preparation

A planning tool for **Whiteout Survival** Survivor vs Survivor (SvS) events. Built with Angular +
Angular Material + Firebase Hosting/Firestore.

Live: **https://svs-prep.web.app**
Part of the [plannet-wos](https://github.com/plannet-wos) suite.

## What's here

The SvS prep sign-up survey — previously a Google Form, manually exported to Excel and fed into a
Python assignment script (see `Documents/SVS/WORKFLOW.md`) — ported to an in-app Angular form that
writes straight to Firestore. One submission doc per player ID (`svs_submissions/{playerId}`); a
resubmission shows a diff of what changed and asks for confirmation before overwriting.

**Per-round config:** update `src/app/core/config/svs-round.config.ts` (the battle date label) at
the start of each new SvS round — this mirrors the config block that used to sit at the top of the
old `assign_appointments.py` script.

**Not yet ported:** the appointment-assignment algorithm and admin/schedule view. Submissions still
need to be pulled out of Firestore and run through the existing Python script for now.

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
app's `svs_submissions`, and battle-calculator's `saves`) live in the **plannet-wos** repo, not
here — that's the sole owner/deployer, see its README. This repo has no `firestore.rules` and no
`"firestore"` key in `firebase.json`, so `firebase deploy` here only ever touches hosting.

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
