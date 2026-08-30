import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { SurveyComponent } from './features/survey/survey';
import { LoginComponent } from './features/login/login';
import { SvsFormListComponent } from './features/admin/form-list/form-list';
import { SvsFormEditorComponent } from './features/admin/form-editor/form-editor';
import { SvsFormSubmissionsComponent } from './features/admin/form-submissions/form-submissions';
import { superadminGuard } from './core/guards/superadmin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'survey/:id', component: SurveyComponent },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: SvsFormListComponent, canActivate: [superadminGuard] },
  { path: 'admin/new', component: SvsFormEditorComponent, canActivate: [superadminGuard] },
  { path: 'admin/:id/submissions', component: SvsFormSubmissionsComponent, canActivate: [superadminGuard] },
  { path: 'admin/:id', component: SvsFormEditorComponent, canActivate: [superadminGuard] },
];
