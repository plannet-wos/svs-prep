import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-switcher',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <a
      mat-mini-fab
      class="switcher-fab"
      [href]="plannetWosUrl"
      target="_self"
      matTooltip="Plannet WOS"
      aria-label="Go to Plannet WOS"
    >
      <mat-icon>apps</mat-icon>
    </a>
  `,
  styles: [
    `
      .switcher-fab {
        position: fixed;
        bottom: 24px;
        left: 24px;
        z-index: 900;
        background: #b71c1c !important;
        color: white !important;
        text-decoration: none;
      }
      .switcher-fab:hover {
        background: #e53935 !important;
      }
    `,
  ],
})
export class AppSwitcherComponent {
  readonly plannetWosUrl = environment.plannetWosUrl;
}
