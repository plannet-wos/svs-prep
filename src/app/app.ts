import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSwitcherComponent } from './shared/app-switcher/app-switcher';
import { AdminLinkComponent } from './shared/admin-link/admin-link';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppSwitcherComponent, AdminLinkComponent],
  template: `<router-outlet /><app-switcher /><app-admin-link />`,
})
export class App {}
