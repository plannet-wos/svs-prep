import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { superadminGuard } from './core/guards/superadmin.guard';

/**
 * Only the home page is eagerly bundled into the initial chunk — everything else loads on demand
 * via loadComponent. Most visitors only ever fill out the survey or check the live schedule, and
 * never touch /login or /admin/*, so bundling those eagerly cost every visitor a download for
 * pages they'd likely never open. This also gives real headroom against the production build's
 * initial-bundle budget (see angular.json) for future features, rather than raising the ceiling
 * every time a new page pulls in another Angular Material module.
 *
 * :stateId gates the home listing and the admin pages (see the multi-state rollout plan) —
 * bare `/` redirects to state 3038, the only state that existed before that rollout, same
 * "transition default" used elsewhere in the suite. survey/:id and assignments/:id stay
 * unprefixed: a form's generated ID is already globally unique, so there's nothing ambiguous
 * for :stateId to disambiguate there, and it keeps shared links working unchanged.
 */
export const routes: Routes = [
  { path: '', redirectTo: '3038', pathMatch: 'full' },
  { path: ':stateId', component: HomeComponent },
  {
    path: 'survey/:id',
    loadComponent: () => import('./features/survey/survey').then((m) => m.SurveyComponent),
  },
  {
    path: 'assignments/:id',
    loadComponent: () =>
      import('./features/assignments/assignments').then((m) => m.SvsAssignmentsComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.LoginComponent),
  },
  {
    path: ':stateId/admin',
    loadComponent: () =>
      import('./features/admin/form-list/form-list').then((m) => m.SvsFormListComponent),
    canActivate: [superadminGuard],
  },
  {
    path: ':stateId/admin/new',
    loadComponent: () =>
      import('./features/admin/form-editor/form-editor').then((m) => m.SvsFormEditorComponent),
    canActivate: [superadminGuard],
  },
  {
    path: ':stateId/admin/:id/submissions',
    loadComponent: () =>
      import('./features/admin/form-submissions/form-submissions').then(
        (m) => m.SvsFormSubmissionsComponent,
      ),
    canActivate: [superadminGuard],
  },
  {
    path: ':stateId/admin/:id/submissions/new',
    loadComponent: () =>
      import('./features/admin/submission-editor/submission-editor').then(
        (m) => m.SvsSubmissionEditorComponent,
      ),
    canActivate: [superadminGuard],
  },
  {
    path: ':stateId/admin/:id/submissions/:playerId/edit',
    loadComponent: () =>
      import('./features/admin/submission-editor/submission-editor').then(
        (m) => m.SvsSubmissionEditorComponent,
      ),
    canActivate: [superadminGuard],
  },
  {
    path: ':stateId/admin/:id',
    loadComponent: () =>
      import('./features/admin/form-editor/form-editor').then((m) => m.SvsFormEditorComponent),
    canActivate: [superadminGuard],
  },

  // --- Legacy redirects (temporary) -----------------------------------------------
  // /admin* links shared/bookmarked before the multi-state rollout had no :stateId
  // segment. Redirect to state 3038 rather than 404. Literal segments (`new`,
  // `submissions`) must stay listed before the `:id` catch-alls at the same depth,
  // same ordering rule as the canonical routes above — Angular matches array order,
  // not specificity. Segment counts never collide with the canonical routes, so this
  // is otherwise unambiguous. Remove once this window has passed.
  { path: 'admin', redirectTo: '3038/admin', pathMatch: 'full' },
  { path: 'admin/new', redirectTo: '3038/admin/new', pathMatch: 'full' },
  { path: 'admin/:id/submissions', redirectTo: '3038/admin/:id/submissions', pathMatch: 'full' },
  { path: 'admin/:id/submissions/new', redirectTo: '3038/admin/:id/submissions/new', pathMatch: 'full' },
  {
    path: 'admin/:id/submissions/:playerId/edit',
    redirectTo: '3038/admin/:id/submissions/:playerId/edit',
    pathMatch: 'full',
  },
  { path: 'admin/:id', redirectTo: '3038/admin/:id', pathMatch: 'full' },
];
