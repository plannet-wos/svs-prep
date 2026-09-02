import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SvsFormWithId } from '../../../core/models/svs-form.model';
import { SvsSubmission } from '../../../core/models/svs-submission.model';
import { SvsAssignmentService } from '../../../core/services/svs-assignment.service';
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

/** Columns a header can sort by — deliberately excludes the availability arrays, which have no
 *  single meaningful order. */
type SortColumn =
  | 'allianceAndName'
  | 'playerId'
  | 'furnaceLevel'
  | 'rfc'
  | 'fc'
  | 'daysConstruction'
  | 'daysResearch'
  | 'daysTraining'
  | 'participation'
  | 'ultraValueCard'
  | 'fairProcess'
  | 'updatedAt';

/** Admin-only: every submission for one SvS prep form, as a sortable table. "Simple" trims it down
 *  to the columns needed for a quick roster glance; "Full" shows everything the survey collects. */
@Component({
  selector: 'app-form-submissions',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './form-submissions.html',
  styleUrl: './form-submissions.scss',
})
export class SvsFormSubmissionsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly forms = inject(SvsFormService);
  private readonly submissions = inject(SvsSubmissionService);
  private readonly assignments = inject(SvsAssignmentService);
  private readonly snackBar = inject(MatSnackBar);

  readonly stateId = this.route.snapshot.paramMap.get('stateId')!;
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly recomputing = signal(false);
  readonly deletingPlayerId = signal<string | null>(null);
  readonly form = signal<SvsFormWithId | null>(null);
  readonly items = signal<SvsSubmission[]>([]);
  readonly formatSlotRanges = formatSlotRanges;

  readonly viewMode = signal<'simple' | 'full'>('full');
  readonly sortColumn = signal<SortColumn>('allianceAndName');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly sortedItems = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...this.items()].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      return String(av).localeCompare(String(bv)) * direction;
    });
  });

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loading.set(true);
    this.loadError.set(false);
    try {
      const [form, submissions] = await Promise.all([
        this.forms.getById(id),
        this.submissions.getAllForForm(id),
      ]);
      this.form.set(form);
      this.items.set(submissions);
    } catch (err) {
      console.error(err);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Clicking the already-active column flips direction; clicking a new one sorts it ascending. */
  sortBy(column: SortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  /** Manual re-run — e.g. after fixing a submission by hand, or to nudge past a race-condition staleness. */
  async recompute(): Promise<void> {
    const form = this.form();
    if (!form) return;

    this.recomputing.set(true);
    try {
      await this.assignments.recompute(form.id);
      this.snackBar.open('Assignments recomputed.', 'OK', { duration: 4000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open('Something went wrong recomputing assignments — please try again.', 'OK', {
        duration: 6000,
      });
    } finally {
      this.recomputing.set(false);
    }
  }

  async delete(submission: SvsSubmission): Promise<void> {
    const form = this.form();
    if (!form) return;

    const confirmed = confirm(
      `Delete the submission from ${submission.allianceAndName}? This can't be undone.`,
    );
    if (!confirmed) return;

    this.deletingPlayerId.set(submission.playerId);
    try {
      await this.submissions.delete(form.id, submission.playerId);
      this.items.update((items) => items.filter((s) => s.playerId !== submission.playerId));
      // Best-effort — a stale schedule heals on the next submission or admin recompute either way.
      this.assignments.recompute(form.id).catch((err) => console.error('Recompute failed', err));
      this.snackBar.open('Submission deleted.', 'OK', { duration: 4000 });
    } catch (err) {
      console.error(err);
      this.snackBar.open(
        'Something went wrong deleting this submission — please try again.',
        'OK',
        {
          duration: 6000,
        },
      );
    } finally {
      this.deletingPlayerId.set(null);
    }
  }
}
