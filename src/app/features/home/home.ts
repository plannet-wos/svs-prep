import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SvsFormWithId, formStatus } from '../../core/models/svs-form.model';
import { SvsFormService } from '../../core/services/svs-form.service';
import { AdminLinkComponent } from '../../shared/admin-link/admin-link';

/** 'YYYY-MM-DD' -> "Saturday 5 September 2026". */
function formatBattleDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Landing page: every SvS prep round, past and future, so a player can see what's coming up and
 * what's already closed — not just be silently dropped into whichever round happened to be open
 * (the previous behavior — see git history). Only rounds currently in their submission window get
 * a "Fill out" button; the rest are shown for context only.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    AdminLinkComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private readonly svsForms = inject(SvsFormService);

  readonly loading = signal(true);
  readonly items = signal<SvsFormWithId[]>([]);
  readonly formatBattleDate = formatBattleDate;
  readonly formStatus = formStatus;

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.items.set(await this.svsForms.getAll());
    } catch (err) {
      console.error(err);
      this.items.set([]); // falls back to the "no rounds" message rather than hanging
    } finally {
      this.loading.set(false);
    }
  }
}
