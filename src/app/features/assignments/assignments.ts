import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SLOT_GROUPS } from '../../core/config/slot-grid';
import {
  AssignmentEntry,
  BuffDay,
  SvsAssignment,
  emptyAssignment,
} from '../../core/models/svs-assignment.model';
import {
  SvsFormWithId,
  Weekday,
  dateForBuffDay,
  formatShortDate,
} from '../../core/models/svs-form.model';
import { SvsSubmission } from '../../core/models/svs-submission.model';
import { SvsAssignmentService } from '../../core/services/svs-assignment.service';
import { SvsFormService } from '../../core/services/svs-form.service';
import { SvsSubmissionService } from '../../core/services/svs-submission.service';

interface BuffDaySection {
  day: BuffDay;
  title: string;
  weekday: Weekday;
}

/**
 * Public, no-login page showing the live appointment schedule for one SvS prep round — the
 * output of core/algorithms/assignment.ts, recomputed after every submission (see
 * SvsAssignmentService and survey.ts's submit()). Updates in real time via a Firestore listener,
 * so a player watching this page sees themselves get moved if a higher-priority player later
 * needs their exact slot.
 */
@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './assignments.html',
  styleUrl: './assignments.scss',
})
export class SvsAssignmentsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly forms = inject(SvsFormService);
  private readonly submissions = inject(SvsSubmissionService);
  private readonly assignmentsService = inject(SvsAssignmentService);

  readonly slotGroups = SLOT_GROUPS;

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly form = signal<SvsFormWithId | null>(null);
  readonly assignment = signal<SvsAssignment | null>(null);
  /** Alliance & name lookup for the unassigned lists, which only store playerIds. */
  private readonly namesByPlayerId = signal<Map<string, string>>(new Map());
  /** Trimmed on every keystroke so "highlight me" works without a submit button. */
  readonly myPlayerId = signal('');

  private unsubscribeAssignment: (() => void) | null = null;

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
      this.namesByPlayerId.set(
        new Map(submissions.map((s: SvsSubmission) => [s.playerId, s.allianceAndName])),
      );

      this.unsubscribeAssignment?.();
      this.unsubscribeAssignment = this.assignmentsService.watch(id, (assignment) => {
        this.assignment.set(assignment ?? emptyAssignment(id));
      });
    } catch (err) {
      console.error(err);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.unsubscribeAssignment?.();
  }

  onPlayerIdInput(event: Event): void {
    this.myPlayerId.set((event.target as HTMLInputElement).value.trim());
  }

  /** Ordered so the page reads in the same day sequence the form collects them in. */
  get sections(): BuffDaySection[] {
    const form = this.form();
    if (!form) return [];
    return [
      { day: 'construction', title: 'Construction', weekday: form.constructionDay },
      { day: 'research', title: 'Research', weekday: form.researchDay },
      { day: 'training', title: 'Troop Training', weekday: form.trainingDay },
    ];
  }

  /** "Monday, 7. September" — the exact calendar date this buff day falls on within the prep week. */
  dayDateLabel(weekday: Weekday): string {
    const form = this.form();
    return form
      ? `${weekday}, ${formatShortDate(dateForBuffDay(form.battleDate, weekday))}`
      : weekday;
  }

  entryFor(day: BuffDay, slot: string): AssignmentEntry | null {
    return this.assignment()?.[day]?.[slot] ?? null;
  }

  isMe(entry: AssignmentEntry | null): boolean {
    const me = this.myPlayerId();
    return !!me && entry?.playerId === me;
  }

  filledCount(day: BuffDay): number {
    return Object.keys(this.assignment()?.[day] ?? {}).length;
  }

  unassigned(day: BuffDay): { playerId: string; allianceAndName: string }[] {
    const assignment = this.assignment();
    const playerIds = assignment
      ? {
          construction: assignment.unassignedConstruction,
          research: assignment.unassignedResearch,
          training: assignment.unassignedTraining,
        }[day]
      : [];
    const names = this.namesByPlayerId();
    return playerIds.map((playerId) => ({
      playerId,
      allianceAndName: names.get(playerId) ?? playerId,
    }));
  }
}
