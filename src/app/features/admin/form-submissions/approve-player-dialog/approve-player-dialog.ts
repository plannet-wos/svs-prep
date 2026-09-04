import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Alliance } from '../../../../core/models/alliance.model';
import { AllianceService } from '../../../../core/services/alliance.service';

export interface ApprovePlayerDialogData {
  playerId: string;
  /** Prefilled from whatever the player typed in "Alliance and name" — see stripAllianceTag. */
  defaultName: string;
  stateId: string;
}

export interface ApprovePlayerDialogResult {
  name: string;
  allianceId: string;
}

/**
 * Opened from form-submissions's "unknown players" section (see SvsForm.requireKnownPlayer) to
 * turn a previously-unrecognized submitter into a real known-player record before their
 * submission is let into the appointment algorithm — see PlayerService.approve. Name is prefilled
 * with whatever the player typed on the survey, editable; alliance is a dropdown over the state's
 * real alliances (see AllianceService) rather than free text, since it has to match a real
 * players/{id}.allianceId for the rest of the shared project to make sense of it.
 */
@Component({
  selector: 'app-approve-player-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './approve-player-dialog.html',
  styleUrl: './approve-player-dialog.scss',
})
export class ApprovePlayerDialogComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly dialogRef = inject(
    MatDialogRef<ApprovePlayerDialogComponent, ApprovePlayerDialogResult>,
  );
  private readonly alliances = inject(AllianceService);
  readonly data = inject<ApprovePlayerDialogData>(MAT_DIALOG_DATA);

  readonly loadingAlliances = signal(true);
  readonly allianceOptions = signal<Alliance[]>([]);

  readonly form = this.fb.group({
    name: [this.data.defaultName, Validators.required],
    allianceId: ['', Validators.required],
  });

  constructor() {
    this.loadAlliances();
  }

  private async loadAlliances(): Promise<void> {
    try {
      this.allianceOptions.set(await this.alliances.getAllForState(this.data.stateId));
    } catch (err) {
      console.error(err);
    } finally {
      this.loadingAlliances.set(false);
    }
  }

  confirm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({ name: v.name.trim(), allianceId: v.allianceId });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
