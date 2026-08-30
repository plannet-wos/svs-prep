import { Component } from '@angular/core';
import { SurveyComponent } from './features/survey/survey';
import { AppSwitcherComponent } from './shared/app-switcher/app-switcher';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SurveyComponent, AppSwitcherComponent],
  template: `<app-survey /><app-switcher />`,
})
export class App {}
