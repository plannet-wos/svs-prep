import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  TIME_BLOCKS,
  ULTRA_CARD_OPTIONS,
} from '../../core/config/svs-round.config';
import { SvsSubmission } from '../../core/models/svs-submission.model';
import { SvsSubmissionService } from '../../core/services/svs-submission.service';
import { DiffDialogComponent } from './diff-dialog/diff-dialog';

function requireAtLeastOneTime(control: { value: string[] }): ValidationErrors | null {
  return control.value?.length ? null : { required: true };
}

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
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
  readonly timeBlocks = TIME_BLOCKS;
  readonly furnaceLevelOptions = FURNACE_LEVEL_OPTIONS;
  readonly participationOptions = PARTICIPATION_OPTIONS;
  readonly ultraCardOptions = ULTRA_CARD_OPTIONS;

  readonly submitting = signal(false);
  readonly checkingPlayerId = signal(false);
  readonly existingSubmission = signal<SvsSubmission | null>(null);

  readonly form = this.fb.group({
    allianceAndName: ['', Validators.required],
    playerId: ['', Validators.required],
    availableTimes: this.fb.control<string[]>([], requireAtLeastOneTime),
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

  toggleTime(block: string, checked: boolean): void {
    const control = this.form.controls.availableTimes;
    const current = control.value;
    control.setValue(checked ? [...current, block] : current.filter((b) => b !== block));
    control.markAsTouched();
  }

  isTimeChecked(block: string): boolean {
    return this.form.controls.availableTimes.value.includes(block);
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
