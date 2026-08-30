import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SvsFormWithId } from '../../../core/models/svs-form.model';
import { SvsSubmission } from '../../../core/models/svs-submission.model';
import { SvsFormService } from '../../../core/services/svs-form.service';
import { SvsSubmissionService } from '../../../core/services/svs-submission.service';

/** Admin-only: every submission for one SvS prep form, as a table. */
@Component({
  selector: 'app-form-submissions',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './form-submissions.html',
  styleUrl: './form-submissions.scss',
})
export class SvsFormSubmissionsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly forms = inject(SvsFormService);
  private readonly submissions = inject(SvsSubmissionService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly form = signal<SvsFormWithId | null>(null);
  readonly items = signal<SvsSubmission[]>([]);

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loading.set(true);
    this.loadError.set(false);
    try {
      const [form, submissions] = await Promise.all([this.forms.getById(id), this.submissions.getAllForForm(id)]);
      this.form.set(form);
      this.items.set(submissions.sort((a, b) => a.allianceAndName.localeCompare(b.allianceAndName)));
    } catch (err) {
      console.error(err);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
