import { Routes } from '@angular/router';
import { SurveyComponent } from './features/survey/survey';
import { LoginComponent } from './features/login/login';
import { SvsFormListComponent } from './features/admin/form-list/form-list';
import { SvsFormEditorComponent } from './features/admin/form-editor/form-editor';
import { superadminGuard } from './core/guards/superadmin.guard';

export const routes: Routes = [
  { path: '', component: SurveyComponent },
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: SvsFormListComponent, canActivate: [superadminGuard] },
  { path: 'admin/new', component: SvsFormEditorComponent, canActivate: [superadminGuard] },
  { path: 'admin/:id', component: SvsFormEditorComponent, canActivate: [superadminGuard] },
];
