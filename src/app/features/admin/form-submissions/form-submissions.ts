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

const MINUTES_PER_SLOT = 30;

function toMinutes(slot: string): number {
  const [h, m] = slot.split(':').map(Number);
  return h * 60 + m;
}

function toLabel(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Collapses a day's 30-min slot list into compact UTC ranges — a raw slot count told the admin
 * nothing about when a player is actually free, which is the entire point of collecting this.
 * e.g. ["00:00","00:30","01:00","15:00"] -> "00:00–01:30, 15:00–15:30".
 */
function formatSlotRanges(slots: string[]): string {
  if (!slots.length) return '—';
  const sorted = [...slots].sort();

  const ranges: string[] = [];
  let start = toMinutes(sorted[0]);
  let prev = start;
  for (let i = 1; i <= sorted.length; i++) {
    const cur = i < sorted.length ? toMinutes(sorted[i]) : null;
    if (cur === null || cur !== prev + MINUTES_PER_SLOT) {
      ranges.push(`${toLabel(start)}–${toLabel(prev + MINUTES_PER_SLOT)}`);
      if (cur !== null) start = cur;
    }
    if (cur !== null) prev = cur;
  }
  return ranges.join(', ');
}

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
  readonly formatSlotRanges = formatSlotRanges;

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
