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
 */
export const routes: Routes = [
  { path: '', component: HomeComponent },
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
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/form-list/form-list').then((m) => m.SvsFormListComponent),
    canActivate: [superadminGuard],
  },
  {
    path: 'admin/new',
    loadComponent: () =>
      import('./features/admin/form-editor/form-editor').then((m) => m.SvsFormEditorComponent),
    canActivate: [superadminGuard],
  },
  {
    path: 'admin/:id/submissions',
    loadComponent: () =>
      import('./features/admin/form-submissions/form-submissions').then(
        (m) => m.SvsFormSubmissionsComponent,
      ),
    canActivate: [superadminGuard],
  },
  {
    path: 'admin/:id/submissions/new',
    loadComponent: () =>
      import('./features/admin/submission-editor/submission-editor').then(
        (m) => m.SvsSubmissionEditorComponent,
      ),
    canActivate: [superadminGuard],
  },
  {
    path: 'admin/:id/submissions/:playerId/edit',
    loadComponent: () =>
      import('./features/admin/submission-editor/submission-editor').then(
        (m) => m.SvsSubmissionEditorComponent,
      ),
    canActivate: [superadminGuard],
  },
  {
    path: 'admin/:id',
    loadComponent: () =>
      import('./features/admin/form-editor/form-editor').then((m) => m.SvsFormEditorComponent),
    canActivate: [superadminGuard],
  },
];
