import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Small fixed top-right button, shown on every page except the survey itself (that page needs to
 * stay uncluttered — see features/survey). Doubles as a toggle: on the public home page it opens
 * /admin, and once inside the admin section it flips to point back at / — otherwise a logged-in
 * superadmin would have no way back to the player-facing views without editing the URL by hand.
 * Always visible when shown — the superadmin guard is what actually gates /admin access.
 */
@Component({
  selector: 'app-admin-link',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    @if (!hidden()) {
      <a
        mat-mini-fab
        class="admin-fab"
        [routerLink]="inAdmin() ? ['/', stateId()] : ['/', stateId(), 'admin']"
        [matTooltip]="inAdmin() ? 'Back to home' : 'Admin'"
        [attr.aria-label]="inAdmin() ? 'Back to home' : 'Go to admin pages'"
      >
        <mat-icon>{{ inAdmin() ? 'home' : 'admin_panel_settings' }}</mat-icon>
      </a>
    }
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
export class AdminLinkComponent {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** First path segment when it's actually a state number, e.g. "3038" from "/3038/admin/xyz"
   * — falls back to 3038 on pages with no state segment at all (login, survey/assignments,
   * which are keyed by form ID, not a state). Numeric-only so "/login" or "/survey/xyz" is
   * never mistaken for a state segment. */
  readonly stateId = computed(() => this.url().match(/^\/(\d+)(?:\/|$)/)?.[1] || '3038');
  readonly inAdmin = computed(() => /^\/[^/]+\/admin/.test(this.url()));
  /** The survey page has its own uncluttered layout — no admin FAB competing with the form. */
  readonly hidden = computed(() => this.url().startsWith('/survey'));
}
