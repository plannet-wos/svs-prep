import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Small fixed top-right icon that opens the admin pages (see app.routes.ts). Always visible —
 * the superadmin guard is what actually gates access, so there's no need to hide this based on
 * auth state; an anonymous visitor just lands on /login.
 */
@Component({
  selector: 'app-admin-link',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <a mat-mini-fab class="admin-fab" routerLink="/admin" matTooltip="Admin" aria-label="Go to admin pages">
      <mat-icon>admin_panel_settings</mat-icon>
    </a>
  `,
  styles: [
    `
      .admin-fab {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 900;
        background: #b71c1c !important;
        color: white !important;
        text-decoration: none;
      }
      .admin-fab:hover {
        background: #e53935 !important;
      }
    `,
  ],
})
export class AdminLinkComponent {}
