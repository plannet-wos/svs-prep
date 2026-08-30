import { Component } from '@angular/core';
import { HomeComponent } from './features/home/home';
import { AppSwitcherComponent } from './shared/app-switcher/app-switcher';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HomeComponent, AppSwitcherComponent],
  template: `<app-home /><app-switcher />`,
})
export class App {}
