import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { FC_LEVEL_OPTIONS, SvsForm, WEEKDAY_OPTIONS, isSaturday } from '../../../core/models/svs-form.model';
import { SvsFormService } from '../../../core/services/svs-form.service';

/** 'YYYY-MM-DD' <-> Date, for the battleDate field which is stored as a plain date string. */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Catches a manually-typed non-Saturday date — the calendar filter alone only stops picker clicks. */
function requireSaturday(control: AbstractControl<Date | null>): ValidationErrors | null {
  return !control.value || isSaturday(control.value) ? null : { notSaturday: true };
}

/** Combines a date-only Date and a time-only Date into one epoch-ms instant. */
function combine(date: Date | null, time: Date | null): number | null {
  if (!date || !time) return null;
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined.getTime();
}

@Component({
  selector: 'app-form-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTimepickerModule,
  ],
  templateUrl: './form-editor.html',
  styleUrl: './form-editor.scss',
})
export class SvsFormEditorComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly forms = inject(SvsFormService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly fcLevelOptions = FC_LEVEL_OPTIONS;
  readonly weekdayOptions = WEEKDAY_OPTIONS;
  /** Battle day is always a Saturday — prep-week dates elsewhere in the app depend on this. */
  readonly battleDateFilter = isSaturday;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly stateId = this.route.snapshot.paramMap.get('stateId')!;
  /** Present when editing an existing form; absent when creating a new one. */
  protected formId: string | null = null;

  readonly form = this.fb.group({
    battleDate: this.fb.control<Date | null>(null, [Validators.required, requireSaturday]),
    highestFcLevel: this.fb.control<(typeof FC_LEVEL_OPTIONS)[number]>(8, Validators.required),
    constructionDay: this.fb.control<(typeof WEEKDAY_OPTIONS)[number]>('Monday', Validators.required),
    researchDay: this.fb.control<(typeof WEEKDAY_OPTIONS)[number]>('Tuesday', Validators.required),
    trainingDay: this.fb.control<(typeof WEEKDAY_OPTIONS)[number]>('Thursday', Validators.required),
    submissionsOpenDate: this.fb.control<Date | null>(null, Validators.required),
    submissionsOpenTime: this.fb.control<Date | null>(null, Validators.required),
    submissionsCloseDate: this.fb.control<Date | null>(null, Validators.required),
    submissionsCloseTime: this.fb.control<Date | null>(null, Validators.required),
    requireKnownPlayer: this.fb.control<boolean>(false),
  });

  constructor() {
    this.load();
  }

  private async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.formId = id;
      try {
        const existing = await this.forms.getById(id);
        if (existing) {
          this.form.patchValue({
            battleDate: new Date(`${existing.battleDate}T00:00:00`),
            highestFcLevel: existing.highestFcLevel,
            constructionDay: existing.constructionDay,
            researchDay: existing.researchDay,
            trainingDay: existing.trainingDay,
            submissionsOpenDate: new Date(existing.submissionsOpenAt),
            submissionsOpenTime: new Date(existing.submissionsOpenAt),
            submissionsCloseDate: new Date(existing.submissionsCloseAt),
            submissionsCloseTime: new Date(existing.submissionsCloseAt),
            requireKnownPlayer: existing.requireKnownPlayer ?? false,
          });
        } else {
          this.snackBar.open("Couldn't find that form.", 'OK', { duration: 5000 });
        }
      } catch (err) {
        console.error(err);
        this.snackBar.open('Something went wrong loading this form — please try again.', 'OK', { duration: 6000 });
      }
    }
    this.loading.set(false);
  }

  /** Null while either half of a pair is missing, or once a close instant isn't after open. */
  get windowError(): 'incomplete' | 'closeBeforeOpen' | null {
    const v = this.form.getRawValue();
    const open = combine(v.submissionsOpenDate, v.submissionsOpenTime);
    const close = combine(v.submissionsCloseDate, v.submissionsCloseTime);
    if (open === null || close === null) return null; // individual required validators cover this
    return close > open ? null : 'closeBeforeOpen';
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.windowError) {
      this.form.markAllAsTouched();
      this.snackBar.open(
        this.windowError === 'closeBeforeOpen'
          ? 'Submissions must close after they open.'
          : 'Please fill in all required fields.',
        'OK',
        { duration: 4000 },
      );
      return;
    }

    const v = this.form.getRawValue();
    const data: Omit<SvsForm, 'createdAt' | 'updatedAt'> = {
      stateId: this.stateId,
      battleDate: toDateString(v.battleDate!),
      highestFcLevel: v.highestFcLevel,
      constructionDay: v.constructionDay,
      researchDay: v.researchDay,
      trainingDay: v.trainingDay,
      submissionsOpenAt: combine(v.submissionsOpenDate, v.submissionsOpenTime)!,
      submissionsCloseAt: combine(v.submissionsCloseDate, v.submissionsCloseTime)!,
      requireKnownPlayer: v.requireKnownPlayer,
    };

    this.saving.set(true);
    try {
      if (this.formId) {
        await this.forms.update(this.formId, data);
      } else {
        await this.forms.create(data);
      }
      this.router.navigate(['/', this.stateId, 'admin']);
    } catch (err) {
      console.error(err);
      this.snackBar.open('Something went wrong saving this form — please try again.', 'OK', { duration: 6000 });
    } finally {
      this.saving.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/', this.stateId, 'admin']);
  }
}
