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
import { MatTooltipModule } from '@angular/material/tooltip';
import { ALL_SLOTS, SLOT_GROUPS, SlotGroup } from '../../core/config/slot-grid';
import {
  FURNACE_LEVEL_OPTIONS,
  PARTICIPATION_OPTIONS,
  SVS_BATTLE_DATE_LABEL,
  ULTRA_CARD_OPTIONS,
} from '../../core/config/svs-round.config';
import { SvsSubmission } from '../../core/models/svs-submission.model';
import { SvsSubmissionService } from '../../core/services/svs-submission.service';
import { DiffDialogComponent } from './diff-dialog/diff-dialog';

/** Players need a realistic spread of options for the assignment algorithm to work with. */
export const MIN_TIME_SLOTS = 5;

function requireMinTimes(min: number) {
  return (control: { value: string[] }): ValidationErrors | null =>
    (control.value?.length ?? 0) >= min ? null : { minTimes: true };
}

/** rfc/fc/constructionSpeedups don't matter once a player is FC8 maxed — nothing left to build. */
const FC8_MAXED = 'FC8 maxed';

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
    MatTooltipModule,
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
  readonly slotGroups = SLOT_GROUPS;
  readonly furnaceLevelOptions = FURNACE_LEVEL_OPTIONS;
  readonly participationOptions = PARTICIPATION_OPTIONS;
  readonly ultraCardOptions = ULTRA_CARD_OPTIONS;

  readonly submitting = signal(false);
  readonly checkingPlayerId = signal(false);
  readonly existingSubmission = signal<SvsSubmission | null>(null);

  /** Best-effort — this is the browser/OS timezone, shown so players know what the "local" column means. */
  readonly localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  readonly form = this.fb.group({
    allianceAndName: ['', Validators.required],
    playerId: ['', Validators.required],
    availableTimes: this.fb.control<string[]>([], requireMinTimes(MIN_TIME_SLOTS)),
    otherAvailableTime: [''],
    furnaceLevel: ['', Validators.required],
    rfc: [0, [Validators.required, Validators.min(0)]],
    fc: [0, [Validators.required, Validators.min(0)]],
    generalSpeedups: [0, [Validators.required, Validators.min(0)]],
    genDaysConstruction: [0, [Validators.required, Validators.min(0)]],
    genDaysResearch: [0, [Validators.required, Validators.min(0)]],
    genDaysTraining: [0, [Validators.required, Validators.min(0)]],
    constructionSpeedups: [0, [Validators.required, Validators.min(0)]],
    trainingSpeedups: [0, [Validators.required, Validators.min(0)]],
    researchSpeedups: [0, [Validators.required, Validators.min(0)]],
    participation: ['', Validators.required],
    ultraValueCard: ['', Validators.required],
    fairProcess: ['' as '' | 'Yes' | 'No', Validators.required],
    fairProcessDetails: [''],
    changeSuggestion: [''],
    feedback: [''],
  });

  private setSlots(slots: readonly string[], selected: boolean): void {
    const control = this.form.controls.availableTimes;
    const current = new Set(control.value);
    for (const slot of slots) {
      if (selected) current.add(slot);
      else current.delete(slot);
    }
    control.setValue(Array.from(current));
    control.markAsTouched();
  }

  toggleSlot(slot: string, checked: boolean): void {
    this.setSlots([slot], checked);
  }

  isSlotChecked(slot: string): boolean {
    return this.form.controls.availableTimes.value.includes(slot);
  }

  /** Whole-group toggle: fills every slot in the group, unless it's already full — then it clears the group. */
  toggleGroup(group: SlotGroup): void {
    this.setSlots(group.slots, this.groupState(group) !== 'all');
  }

  groupState(group: SlotGroup): 'all' | 'some' | 'none' {
    const selected = group.slots.filter((s) => this.isSlotChecked(s)).length;
    if (selected === 0) return 'none';
    return selected === group.slots.length ? 'all' : 'some';
  }

  selectAllTimes(): void {
    this.setSlots(ALL_SLOTS, true);
  }

  clearAllTimes(): void {
    const control = this.form.controls.availableTimes;
    control.setValue([]);
    control.markAsTouched();
  }

  timesSelectedCount(): number {
    return this.form.controls.availableTimes.value.length;
  }

  /** e.g. "09 - 12 UTC" -> "2:00 – 5:00 AM" in the browser's local timezone. */
  localGroupRangeLabel(group: SlotGroup): string {
    const match = group.label.match(/^(\d{2}) - (\d{2})/);
    if (!match) return '';
    const [, startStr, endStr] = match;
    return `${this.localHourLabel(Number(startStr))} – ${this.localHourLabel(Number(endStr))}`;
  }

  /** e.g. "09:00" -> "11:00 AM" in the browser's local timezone (for the per-slot tooltip). */
  localSlotLabel(slot: string): string {
    const [h, m] = slot.split(':').map(Number);
    const today = new Date();
    return new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), h, m),
    ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  /**
   * FC8-maxed players have nothing left to build — RFC, FC, construction
   * speedups, and general speedup days allocated to construction all
   * don't apply.
   */
  onFurnaceLevelChange(level: string): void {
    const maxed = level === FC8_MAXED;
    const fields = [
      this.form.controls.rfc,
      this.form.controls.fc,
      this.form.controls.constructionSpeedups,
      this.form.controls.genDaysConstruction,
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

  private localHourLabel(hour: number): string {
    const today = new Date();
    return new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hour),
    ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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
      availableTimes: v.availableTimes,
      otherAvailableTime: v.otherAvailableTime.trim(),
      furnaceLevel: v.furnaceLevel,
      rfc: v.rfc,
      fc: v.fc,
      generalSpeedups: v.generalSpeedups,
      genDaysConstruction: v.genDaysConstruction,
      genDaysResearch: v.genDaysResearch,
      genDaysTraining: v.genDaysTraining,
      constructionSpeedups: v.constructionSpeedups,
      trainingSpeedups: v.trainingSpeedups,
      researchSpeedups: v.researchSpeedups,
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
        availableTimes: [],
        otherAvailableTime: '',
        furnaceLevel: '',
        rfc: 0,
        fc: 0,
        generalSpeedups: 0,
        genDaysConstruction: 0,
        genDaysResearch: 0,
        genDaysTraining: 0,
        constructionSpeedups: 0,
        trainingSpeedups: 0,
        researchSpeedups: 0,
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
