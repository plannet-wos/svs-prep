import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import {
  FURNACE_LEVEL_OPTIONS,
  PARTICIPATION_OPTIONS,
  SVS_BATTLE_DATE_LABEL,
  ULTRA_CARD_OPTIONS,
} from '../../core/config/svs-round.config';
import { SvsSubmission } from '../../core/models/svs-submission.model';
import { SvsSubmissionService } from '../../core/services/svs-submission.service';
import { DayAvailabilityPickerComponent } from './day-availability-picker/day-availability-picker';
import { DiffDialogComponent } from './diff-dialog/diff-dialog';

/** Players need a realistic spread of options for the assignment algorithm to work with, per day. */
export const MIN_TIME_SLOTS = 5;

function requireMinTimes(min: number) {
  return (control: { value: string[] }): ValidationErrors | null =>
    (control.value?.length ?? 0) >= min ? null : { minTimes: true };
}

/** RFC/FC/construction-days don't matter once a player is FC8 maxed — nothing left to build. */
const FC8_MAXED = 'FC8 maxed';

/** Must start with a 3-character alliance tag in brackets, e.g. "[HOC] plannet". */
const ALLIANCE_TAG_PATTERN = /^\[[A-Za-z0-9]{3}\]/;

/** In-game player IDs are exactly 9 digits. */
const PLAYER_ID_PATTERN = /^[0-9]{9}$/;

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [
    ReactiveFormsModule,
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
  private readonly submissions = inject(SvsSubmissionService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly battleDateLabel = SVS_BATTLE_DATE_LABEL;
  readonly minTimeSlots = MIN_TIME_SLOTS;
  readonly furnaceLevelOptions = FURNACE_LEVEL_OPTIONS;
  readonly participationOptions = PARTICIPATION_OPTIONS;
  readonly ultraCardOptions = ULTRA_CARD_OPTIONS;

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

  /** FC8-maxed players have nothing left to build — RFC, FC, and construction days don't apply. */
  onFurnaceLevelChange(level: string): void {
    const maxed = level === FC8_MAXED;
    const fields = [this.form.controls.rfc, this.form.controls.fc, this.form.controls.daysConstruction];
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
    const playerId = this.form.controls.playerId.value.trim();
    if (!playerId) {
      this.existingSubmission.set(null);
      return;
    }
    this.checkingPlayerId.set(true);
    try {
      const existing = await this.submissions.getByPlayerId(playerId);
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

  private currentAnswers(): Omit<SvsSubmission, 'createdAt' | 'updatedAt'> {
    const v = this.form.getRawValue();
    return {
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill in all required fields.', 'OK', { duration: 4000 });
      return;
    }

    this.submitting.set(true);
    try {
      const answers = this.currentAnswers();
      const existing = await this.submissions.getByPlayerId(answers.playerId);

      if (existing) {
        const confirmed = await firstValueFrom(
          this.dialog
            .open(DiffDialogComponent, { data: { before: existing, after: answers }, width: '520px' })
            .afterClosed(),
        );
        if (!confirmed) {
          this.submitting.set(false);
          return;
        }
      }

      await this.submissions.save(answers.playerId, answers, !existing);
      this.snackBar.open('Thanks! Your answers were saved.', 'OK', { duration: 5000 });
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
