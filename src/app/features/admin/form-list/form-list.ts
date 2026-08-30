import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SvsFormWithId, formStatus } from '../../../core/models/svs-form.model';
import { SvsFormService } from '../../../core/services/svs-form.service';
import { AuthService } from '../../../core/services/auth.service';

/** Admin landing page: every SvS prep form ever created, most recent battle date first. */
@Component({
  selector: 'app-form-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './form-list.html',
  styleUrl: './form-list.scss',
})
export class SvsFormListComponent {
  private readonly forms = inject(SvsFormService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly items = signal<SvsFormWithId[]>([]);
  readonly deletingId = signal<string | null>(null);
  readonly formStatus = formStatus;

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      this.items.set(await this.forms.getAll());
    } catch (err) {
      console.error(err);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Stops the click from also triggering the card's own routerLink (into the editor). */
  async delete(form: SvsFormWithId, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = confirm(
      `Delete the ${form.battleDate} SvS prep form? Past submissions for it are kept, but players can no longer view or submit to it. This can't be undone.`,
    );
    if (!confirmed) return;

    this.deletingId.set(form.id);
    try {
      await this.forms.delete(form.id);
      this.items.update((items) => items.filter((f) => f.id !== form.id));
    } catch (err) {
      console.error(err);
      this.snackBar.open('Something went wrong deleting this form — please try again.', 'OK', { duration: 6000 });
    } finally {
      this.deletingId.set(null);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
