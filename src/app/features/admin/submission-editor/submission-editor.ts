import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ALL_SLOTS } from '../../../core/config/slot-grid';
import { PARTICIPATION_OPTIONS, ULTRA_CARD_OPTIONS } from '../../../core/config/svs-round.config';
import {
  SvsFormWithId,
  Weekday,
  formStatus,
  furnaceLevelOptions,
  maxedFurnaceLabel,
} from '../../../core/models/svs-form.model';
import { SvsSubmission } from '../../../core/models/svs-submission.model';
import { SvsAssignmentService } from '../../../core/services/svs-assignment.service';
import { SvsFormService } from '../../../core/services/svs-form.service';
import { SvsSubmissionService } from '../../../core/services/svs-submission.service';
import {
  ALLIANCE_TAG_PATTERN,
  MAX_SPEEDUP_DAYS,
  MIN_TIME_SLOTS,
  PLAYER_ID_PATTERN,
  requireMinTimes,
  scrollToFirstInvalidControl,
} from '../../../core/validators/svs-submission.validators';
import { DayAvailabilityPickerComponent } from '../../survey/day-availability-picker/day-availability-picker';

/**
 * Admin-only create/edit form for a single player's submission — the same shape the public
 * survey collects (see features/survey/survey.ts), minus the "is this round even open" gating and
 * the resubmission diff-confirmation, since an admin here is deliberately entering or correcting
 * data rather than self-reporting. Also exposes the three pinned-slot overrides (see
 * core/algorithms/assignment.ts), which the public survey never shows.
 *
 * Two routes share this component (see app.routes.ts): `/admin/:id/submissions/new` (create) and
 * `/admin/:id/submissions/:playerId/edit` (edit) — presence of the `playerId` route param is what
 * distinguishes the two modes.
 */
@Component({
  selector: 'app-submission-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    DayAvailabilityPickerComponent,
  ],
  templateUrl: './submission-editor.html',
  styleUrl: './submission-editor.scss',
})
export class SvsSubmissionEditorComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly forms = inject(SvsFormService);
  private readonly submissions = inject(SvsSubmissionService);
  private readonly assignments = inject(SvsAssignmentService);
  private readonly snackBar = inject(MatSnackBar);

  readonly minTimeSlots = MIN_TIME_SLOTS;
  readonly maxSpeedupDays = MAX_SPEEDUP_DAYS;
  readonly participationOptions = PARTICIPATION_OPTIONS;
  readonly ultraCardOptions = ULTRA_CARD_OPTIONS;
  readonly allSlots = ALL_SLOTS;
  readonly maxedFurnaceLabel = maxedFurnaceLabel;

  /** Drives the template's three buff-day cards without repeating per-day control names inline.
   *  `wanted` backs that day's "wants an appointment?" checkbox (default checked) — see
   *  onWantedChange and onFurnaceLevelChange (Construction's is forced off while FC8/etc-maxed). */
  readonly dayInputs = [
    {
      day: 'construction' as const,
      title: 'Construction',
      daysControl: 'daysConstruction' as const,
      availabilityControl: 'availableTimesConstruction' as const,
      pinControl: 'pinnedSlotConstruction' as const,
      wanted: signal(true),
    },
    {
      day: 'research' as const,
      title: 'Research',
      daysControl: 'daysResearch' as const,
      availabilityControl: 'availableTimesResearch' as const,
      pinControl: 'pinnedSlotResearch' as const,
      wanted: signal(true),
    },
    {
      day: 'training' as const,
      title: 'Troop Training',
      daysControl: 'daysTraining' as const,
      availabilityControl: 'availableTimesTraining' as const,
      pinControl: 'pinnedSlotTraining' as const,
      wanted: signal(true),
    },
  ];

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly formId: string = this.route.snapshot.paramMap.get('id')!;
  /** Present when editing an existing submission; absent when creating a new one. */
  readonly editingPlayerId: string | null = this.route.snapshot.paramMap.get('playerId');
  readonly svsForm = signal<SvsFormWithId | null>(null);

  readonly form = this.fb.group({
    allianceAndName: ['', [Validators.required, Validators.pattern(ALLIANCE_TAG_PATTERN)]],
    playerId: ['', [Validators.required, Validators.pattern(PLAYER_ID_PATTERN)]],

    availableTimesConstruction: this.fb.control<string[]>([], requireMinTimes(MIN_TIME_SLOTS)),
    availableTimesResearch: this.fb.control<string[]>([], requireMinTimes(MIN_TIME_SLOTS)),
    availableTimesTraining: this.fb.control<string[]>([], requireMinTimes(MIN_TIME_SLOTS)),

    daysConstruction: [
      0,
      [Validators.required, Validators.min(0), Validators.max(MAX_SPEEDUP_DAYS)],
    ],
    daysResearch: [0, [Validators.required, Validators.min(0), Validators.max(MAX_SPEEDUP_DAYS)]],
    daysTraining: [0, [Validators.required, Validators.min(0), Validators.max(MAX_SPEEDUP_DAYS)]],

    furnaceLevel: ['', Validators.required],
    rfc: [0, [Validators.required, Validators.min(0)]],
    fc: [0, [Validators.required, Validators.min(0)]],

    participation: ['', Validators.required],
    ultraValueCard: ['', Validators.required],
    // Feedback section is fully optional — no validators on any field below.
    fairProcess: ['' as '' | 'Yes' | 'No'],
    fairProcessDetails: [''],
    changeSuggestion: [''],
    feedback: [''],

    pinnedSlotConstruction: this.fb.control<string | null>(null),
    pinnedSlotResearch: this.fb.control<string | null>(null),
    pinnedSlotTraining: this.fb.control<string | null>(null),
  });

  constructor() {
    if (this.editingPlayerId) {
      this.form.controls.playerId.disable(); // doc ID is derived from it — never changes after creation
    }
    this.load();
  }

  private async load(): Promise<void> {
    try {
      const svsForm = await this.forms.getById(this.formId);
      this.svsForm.set(svsForm);

      if (this.editingPlayerId) {
        const existing = await this.submissions.getByFormAndPlayerId(
          this.formId,
          this.editingPlayerId,
        );
        if (existing) {
          this.form.patchValue(existing);
          this.onFurnaceLevelChange(existing.furnaceLevel);
          this.syncWantedFromExisting(existing);
        } else {
          this.snackBar.open("Couldn't find that submission.", 'OK', { duration: 5000 });
        }
      }
    } catch (err) {
      console.error(err);
      this.snackBar.open('Something went wrong loading this page — please try again.', 'OK', {
        duration: 6000,
      });
    } finally {
      this.loading.set(false);
    }
  }

  /** ["Lower than FC8", "FC8 (not maxed)", "FC8 maxed"] parametrized by this round's FC level. */
  get furnaceLevelOptions(): readonly string[] {
    const svsForm = this.svsForm();
    return svsForm ? furnaceLevelOptions(svsForm.highestFcLevel) : [];
  }

  buffDayWeekday(day: 'construction' | 'research' | 'training'): Weekday | null {
    const svsForm = this.svsForm();
    if (!svsForm) return null;
    return {
      construction: svsForm.constructionDay,
      research: svsForm.researchDay,
      training: svsForm.trainingDay,
    }[day];
  }

  /** Tracks whether the *previous* furnace-level change left us maxed, so switching between two
   *  non-maxed levels never stomps on the admin's own Construction "wanted" choice (see
   *  onFurnaceLevelChange). */
  private wasMaxedFurnace = false;

  private applyDayWanted(
    wants: boolean,
    daysControl: FormControl<number>,
    availabilityControl: FormControl<string[]>,
  ): void {
    if (wants) {
      daysControl.enable();
      availabilityControl.enable();
    } else {
      daysControl.setValue(0);
      daysControl.disable();
      availabilityControl.setValue([]);
      availabilityControl.disable();
    }
  }

  /** Toggles a buff day's "wants an appointment?" checkbox — unchecking clears and disables that
   *  day's days/availability fields, which is what excludes the player from that day's appointment
   *  contest (core/algorithms/assignment.ts never considers an applicant who selected zero slots). */
  onWantedChange(entry: (typeof this.dayInputs)[number], wants: boolean): void {
    entry.wanted.set(wants);
    this.applyDayWanted(
      wants,
      this.form.controls[entry.daysControl],
      this.form.controls[entry.availabilityControl],
    );
  }

  /** FC8/FC10/etc-maxed players have nothing left to build — RFC and FC don't apply, and they
   *  aren't eligible for a Construction appointment at all, so its "wanted" checkbox is forced off
   *  and locked (see the template) rather than left for the admin to toggle. */
  onFurnaceLevelChange(level: string): void {
    const svsForm = this.svsForm();
    const maxed = !!svsForm && level === maxedFurnaceLabel(svsForm.highestFcLevel);
    const wasMaxed = this.wasMaxedFurnace;
    this.wasMaxedFurnace = maxed;

    const numberFields = [this.form.controls.rfc, this.form.controls.fc];
    for (const field of numberFields) {
      if (maxed) {
        field.setValue(0);
        field.disable();
      } else {
        field.enable();
      }
    }

    const construction = this.dayInputs.find((d) => d.day === 'construction')!;
    if (maxed) {
      this.onWantedChange(construction, false);
    } else if (wasMaxed) {
      // Coming back from maxed — the checkbox was locked off, so re-include by default rather
      // than leave it stuck unchecked with no way for the admin to have unchecked it themselves.
      this.onWantedChange(construction, true);
    }
    // Moving between two non-maxed levels: leave the admin's own Construction choice alone.
  }

  /** After loading an existing submission, restore each day's checkbox (and disabled state) to
   *  match what was actually saved — an empty availability array means that day was previously
   *  opted out of (Construction's own maxed-exclusion is already handled by onFurnaceLevelChange
   *  above, called just before this). */
  private syncWantedFromExisting(existing: SvsSubmission): void {
    for (const d of this.dayInputs) {
      if (!existing[d.availabilityControl].length) this.onWantedChange(d, false);
    }
  }

  private currentAnswers(): Omit<SvsSubmission, 'createdAt' | 'updatedAt'> {
    const v = this.form.getRawValue();
    return {
      formId: this.formId,
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
      pinnedSlotConstruction: v.pinnedSlotConstruction,
      pinnedSlotResearch: v.pinnedSlotResearch,
      pinnedSlotTraining: v.pinnedSlotTraining,
    };
  }

  /**
   * Checks this save's non-empty pinned slots against every other submission's live pins for the
   * same form — pins are rare and this list is small, so a full fetch right before saving is
   * simpler than trying to keep a client-side index in sync. Excludes this submission itself so
   * re-saving an existing pin unchanged never flags against its own prior value.
   */
  private async findPinCollisions(
    answers: Omit<SvsSubmission, 'createdAt' | 'updatedAt'>,
  ): Promise<{ dayTitle: string; slot: string; holder: SvsSubmission }[]> {
    const others = (await this.submissions.getAllForForm(this.formId)).filter(
      (s) => s.playerId !== answers.playerId,
    );
    const collisions: { dayTitle: string; slot: string; holder: SvsSubmission }[] = [];
    for (const d of this.dayInputs) {
      const slot = answers[d.pinControl];
      if (!slot) continue;
      const holder = others.find((s) => s[d.pinControl] === slot);
      if (holder) collisions.push({ dayTitle: d.title, slot, holder });
    }
    return collisions;
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      scrollToFirstInvalidControl(this.form);
      this.snackBar.open('Please fix the highlighted fields.', 'OK', { duration: 4000 });
      return;
    }

    this.saving.set(true);
    try {
      const answers = this.currentAnswers();

      if (!this.editingPlayerId) {
        const clash = await this.submissions.getByFormAndPlayerId(this.formId, answers.playerId);
        if (clash) {
          this.snackBar.open(
            'A submission for this Player ID already exists — edit it instead.',
            'OK',
            {
              duration: 6000,
            },
          );
          this.saving.set(false);
          return;
        }
      }

      const collisions = await this.findPinCollisions(answers);
      if (collisions.length) {
        const details = collisions
          .map(
            (c) =>
              `• ${c.dayTitle}: ${c.slot} UTC is already pinned to ${c.holder.allianceAndName}`,
          )
          .join('\n');
        const proceed = confirm(
          `This pin collides with an existing one:\n\n${details}\n\n` +
            `The algorithm will let whichever pin it processes first keep the slot, and fall the ` +
            `other player back to normal matching over their own selected availability — it won't ` +
            `error, but only one of them will actually get it. Save anyway?`,
        );
        if (!proceed) {
          this.saving.set(false);
          return;
        }
      }

      await this.submissions.save(this.formId, answers.playerId, answers, !this.editingPlayerId);
      // Best-effort — a stale schedule heals on the next submission or admin recompute either way.
      this.assignments
        .recompute(this.formId)
        .catch((err) => console.error('Recompute failed', err));

      this.snackBar.open('Submission saved.', 'OK', { duration: 4000 });
      this.router.navigate(['/admin', this.formId, 'submissions']);
    } catch (err) {
      console.error(err);
      this.snackBar.open('Something went wrong saving this submission — please try again.', 'OK', {
        duration: 6000,
      });
    } finally {
      this.saving.set(false);
    }
  }

  async delete(): Promise<void> {
    if (!this.editingPlayerId) return;
    const confirmed = confirm(
      `Delete the submission from ${this.form.getRawValue().allianceAndName || this.editingPlayerId}? This can't be undone.`,
    );
    if (!confirmed) return;

    this.deleting.set(true);
    try {
      await this.submissions.delete(this.formId, this.editingPlayerId);
      this.assignments
        .recompute(this.formId)
        .catch((err) => console.error('Recompute failed', err));
      this.snackBar.open('Submission deleted.', 'OK', { duration: 4000 });
      this.router.navigate(['/admin', this.formId, 'submissions']);
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
      this.deleting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/admin', this.formId, 'submissions']);
  }

  /** Exposed so the template can note when this round's window isn't open (informational only —
   *  the admin can still add/edit submissions for any round regardless). */
  get formStatusLabel(): string {
    const svsForm = this.svsForm();
    return svsForm ? formStatus(svsForm) : '';
  }
}
