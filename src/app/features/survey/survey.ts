import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PARTICIPATION_OPTIONS, ULTRA_CARD_OPTIONS } from '../../core/config/svs-round.config';
import {
  SvsFormWithId,
  Weekday,
  dateForBuffDay,
  formStatus,
  formatShortDate,
  furnaceLevelOptions,
  maxedFurnaceLabel,
  prepWeekMonday,
} from '../../core/models/svs-form.model';
import { SvsSubmission } from '../../core/models/svs-submission.model';
import { SvsAssignmentService } from '../../core/services/svs-assignment.service';
import { SvsFormService } from '../../core/services/svs-form.service';
import { SvsSubmissionService } from '../../core/services/svs-submission.service';
import { AssignmentStatusDialogComponent } from './assignment-status-dialog/assignment-status-dialog';
import { DayAvailabilityPickerComponent } from './day-availability-picker/day-availability-picker';
import { DiffDialogComponent } from './diff-dialog/diff-dialog';

/** Players need a realistic spread of options for the assignment algorithm to work with, per day. */
export const MIN_TIME_SLOTS = 5;

function requireMinTimes(min: number) {
  return (control: { value: string[] }): ValidationErrors | null =>
    (control.value?.length ?? 0) >= min ? null : { minTimes: true };
}

/** Must start with a 3-character alliance tag in brackets, e.g. "[HOC] plannet". */
const ALLIANCE_TAG_PATTERN = /^\[[A-Za-z0-9]{3}\]/;

/** In-game player IDs are exactly 9 digits. */
const PLAYER_ID_PATTERN = /^[0-9]{9}$/;

/** 'YYYY-MM-DD' -> "Saturday 5 September 2026". */
function formatBattleDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DayAvailabilityPickerComponent,
  ],
  templateUrl: './survey.html',
  styleUrl: './survey.scss',
})
export class SurveyComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly route = inject(ActivatedRoute);
  private readonly svsForms = inject(SvsFormService);
  private readonly submissions = inject(SvsSubmissionService);
  private readonly assignments = inject(SvsAssignmentService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly minTimeSlots = MIN_TIME_SLOTS;
  readonly participationOptions = PARTICIPATION_OPTIONS;
  readonly ultraCardOptions = ULTRA_CARD_OPTIONS;
  /** Exposed for the template's "You're FC{n} maxed" hint. */
  readonly maxedFurnaceLabel = maxedFurnaceLabel;

  readonly loadingForm = signal(true);
  /** The form this route's :id points to — null if not found, or no longer open (see loadForm). */
  readonly openForm = signal<SvsFormWithId | null>(null);
  readonly submitting = signal(false);
  readonly checkingPlayerId = signal(false);
  readonly existingSubmission = signal<SvsSubmission | null>(null);

  /** Shown once in the page intro — each day's picker shows times in this same browser timezone. */
  readonly localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  readonly form = this.fb.group({
    allianceAndName: ['', [Validators.required, Validators.pattern(ALLIANCE_TAG_PATTERN)]],
    playerId: ['', [Validators.required, Validators.pattern(PLAYER_ID_PATTERN)]],

    availableTimesConstruction: this.fb.control<string[]>([], requireMinTimes(MIN_TIME_SLOTS)),
    availableTimesResearch: this.fb.control<string[]>([], requireMinTimes(MIN_TIME_SLOTS)),
    availableTimesTraining: this.fb.control<string[]>([], requireMinTimes(MIN_TIME_SLOTS)),

    daysConstruction: [0, [Validators.required, Validators.min(0)]],
    daysResearch: [0, [Validators.required, Validators.min(0)]],
    daysTraining: [0, [Validators.required, Validators.min(0)]],

    furnaceLevel: ['', Validators.required],
    rfc: [0, [Validators.required, Validators.min(0)]],
    fc: [0, [Validators.required, Validators.min(0)]],

    participation: ['', Validators.required],
    ultraValueCard: ['', Validators.required],
    fairProcess: ['' as '' | 'Yes' | 'No', Validators.required],
    fairProcessDetails: [''],
    changeSuggestion: [''],
    feedback: [''],
  });

  constructor() {
    this.loadForm();
  }

  /**
   * Loads the round the :id route param points to (picked on the home screen — see
   * features/home/home.ts). Only ever exposes it via `openForm` if it's actually still open:
   * someone could bookmark/share a survey link after its window closes, and this must keep
   * refusing submissions the same way the old "no round open" fallback did.
   */
  private async loadForm(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      const form = id ? await this.svsForms.getById(id) : null;
      this.openForm.set(form && formStatus(form) === 'open' ? form : null);
    } catch (err) {
      console.error(err);
      this.openForm.set(null); // falls back to the "not available" message rather than hanging
    } finally {
      this.loadingForm.set(false);
    }
  }

  /** Derived from the loaded form's battle date — e.g. "Saturday 5 September 2026". */
  get battleDateLabel(): string {
    const form = this.openForm();
    return form ? formatBattleDate(form.battleDate) : '';
  }

  /** ["Lower than FC8", "FC8 (not maxed)", "FC8 maxed"] parametrized by this round's FC level. */
  get furnaceLevelOptions(): readonly string[] {
    const form = this.openForm();
    return form ? furnaceLevelOptions(form.highestFcLevel) : [];
  }

  /** "7. September – 11. September" — the Monday-Friday prep week leading up to the battle. */
  get prepWeekLabel(): string {
    const form = this.openForm();
    if (!form) return '';
    const monday = prepWeekMonday(form.battleDate);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    return `${formatShortDate(monday)} – ${formatShortDate(friday)}`;
  }

  /** "12. September" — compact battle date for the "SvS battle" card title. */
  get battleShortDateLabel(): string {
    const form = this.openForm();
    return form ? formatShortDate(new Date(`${form.battleDate}T00:00:00`)) : '';
  }

  /** "Monday, 7. September" — a buff day's exact calendar date within the prep week. */
  buffDayLabel(day: Weekday): string {
    const form = this.openForm();
    return form ? `${day}, ${formatShortDate(dateForBuffDay(form.battleDate, day))}` : day;
  }

  /** FC8/FC10/etc-maxed players have nothing left to build — RFC, FC, and construction days don't apply. */
  onFurnaceLevelChange(level: string): void {
    const form = this.openForm();
    const maxed = !!form && level === maxedFurnaceLabel(form.highestFcLevel);
    const fields = [
      this.form.controls.rfc,
      this.form.controls.fc,
      this.form.controls.daysConstruction,
    ];
    for (const field of fields) {
      if (maxed) {
        field.setValue(0);
        field.disable();
      } else {
        field.enable();
      }
    }
  }

  async onPlayerIdBlur(): Promise<void> {
    const form = this.openForm();
    const playerId = this.form.controls.playerId.value.trim();
    if (!playerId || !form) {
      this.existingSubmission.set(null);
      return;
    }
    this.checkingPlayerId.set(true);
    try {
      const existing = await this.submissions.getByFormAndPlayerId(form.id, playerId);
      this.existingSubmission.set(existing);
    } catch {
      // Non-fatal — the submit-time check will still catch it. Silent here
      // so a flaky lookup doesn't block someone from filling out the form.
    } finally {
      this.checkingPlayerId.set(false);
    }
  }

  loadPreviousAnswers(): void {
    const existing = this.existingSubmission();
    if (!existing) return;
    this.form.patchValue(existing);
    this.onFurnaceLevelChange(existing.furnaceLevel);
    this.snackBar.open('Loaded your previous answers — edit and resubmit below.', 'OK', {
      duration: 4000,
    });
  }

  private currentAnswers(formId: string): Omit<SvsSubmission, 'createdAt' | 'updatedAt'> {
    const v = this.form.getRawValue();
    return {
      formId,
      allianceAndName: v.allianceAndName.trim(),
      playerId: v.playerId.trim(),
      availableTimesConstruction: v.availableTimesConstruction,
      availableTimesResearch: v.availableTimesResearch,
      availableTimesTraining: v.availableTimesTraining,
      daysConstruction: v.daysConstruction,
      daysResearch: v.daysResearch,
      daysTraining: v.daysTraining,
      furnaceLevel: v.furnaceLevel,
      rfc: v.rfc,
      fc: v.fc,
      participation: v.participation,
      ultraValueCard: v.ultraValueCard,
      fairProcess: v.fairProcess,
      fairProcessDetails: v.fairProcessDetails.trim(),
      changeSuggestion: v.changeSuggestion.trim(),
      feedback: v.feedback.trim(),
    };
  }

  async submit(): Promise<void> {
    const form = this.openForm();
    if (!form) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill in all required fields.', 'OK', { duration: 4000 });
      return;
    }

    this.submitting.set(true);
    try {
      const answers = this.currentAnswers(form.id);
      const existing = await this.submissions.getByFormAndPlayerId(form.id, answers.playerId);

      if (existing) {
        const confirmed = await firstValueFrom(
          this.dialog
            .open(DiffDialogComponent, {
              data: { before: existing, after: answers },
              width: '520px',
            })
            .afterClosed(),
        );
        if (!confirmed) {
          this.submitting.set(false);
          return;
        }
      }

      await this.submissions.save(form.id, answers.playerId, answers, !existing);
      this.snackBar.open('Thanks! Your answers were saved.', 'OK', { duration: 5000 });

      // Best-effort: the submission is already safely saved above, so a failure here shouldn't
      // block or scare the player if it fails — they just won't see the status popup below.
      try {
        const status = await this.assignments.recomputeAndGetStatus(form.id, answers.playerId);
        const byDay = Object.fromEntries(status.map((s) => [s.day, s]));
        this.dialog.open(AssignmentStatusDialogComponent, {
          data: {
            days: [
              {
                title: 'Construction',
                dateLabel: this.buffDayLabel(form.constructionDay),
                status: byDay['construction'],
              },
              {
                title: 'Research',
                dateLabel: this.buffDayLabel(form.researchDay),
                status: byDay['research'],
              },
              {
                title: 'Troop Training',
                dateLabel: this.buffDayLabel(form.trainingDay),
                status: byDay['training'],
              },
            ],
          },
          width: '480px',
        });
      } catch (err) {
        console.error('Failed to compute assignment status', err);
      }

      this.form.reset({
        allianceAndName: '',
        playerId: '',
        availableTimesConstruction: [],
        availableTimesResearch: [],
        availableTimesTraining: [],
        daysConstruction: 0,
        daysResearch: 0,
        daysTraining: 0,
        furnaceLevel: '',
        rfc: 0,
        fc: 0,
        participation: '',
        ultraValueCard: '',
        fairProcess: '',
        fairProcessDetails: '',
        changeSuggestion: '',
        feedback: '',
      });
      this.onFurnaceLevelChange(''); // form.reset() doesn't undo .disable() — re-enable for the next entry
      this.existingSubmission.set(null);
    } catch (err) {
      console.error(err);
      this.snackBar.open('Something went wrong saving your answers — please try again.', 'OK', {
        duration: 6000,
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
