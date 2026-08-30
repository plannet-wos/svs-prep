import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
  ],
  templateUrl: './form-list.html',
  styleUrl: './form-list.scss',
})
export class SvsFormListComponent {
  private readonly forms = inject(SvsFormService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly items = signal<SvsFormWithId[]>([]);
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

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
