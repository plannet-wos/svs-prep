# SvS Preparation

A planning tool for **Whiteout Survival** Survivor vs Survivor (SvS) events. Built with Angular + Firebase Hosting.

Live: **https://svs-prep.web.app**
Part of the [plannet-wos](https://github.com/plannet-wos) suite.

## Setup

```bash
npm install
npm start
```

Then open `http://localhost:4200/`. To run multiple apps side-by-side, override the port with `npm start -- --port 4XXX`.

## Firebase config

This app uses Firebase only for hosting — no Firestore, no Auth. There's no checked-in API key.

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
