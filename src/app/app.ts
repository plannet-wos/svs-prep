import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppSwitcherComponent } from './shared/app-switcher/app-switcher';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppSwitcherComponent],
  template: `<router-outlet /><app-switcher />`,
})
export class App {}
