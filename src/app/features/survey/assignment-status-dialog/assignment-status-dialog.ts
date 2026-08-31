import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlayerDayStatus } from '../../../core/algorithms/assignment';

export interface AssignmentStatusDialogDay {
  /** e.g. "Construction" */
  title: string;
  /** e.g. "Monday, 7. September" */
  dateLabel: string;
  status: PlayerDayStatus;
}

export interface AssignmentStatusDialogData {
  days: AssignmentStatusDialogDay[];
}

/** What the player chose to do next — see survey.ts's submit(), which awaits this. */
export type AssignmentStatusDialogResult = 'edit' | 'assignments';

/**
 * Shown right after a successful submission (see survey.ts's submit()) — "here's where you stand
 * right now" for each buff day, computed live from every current submission (see
 * core/algorithms/assignment.ts's playerStatus and SvsAssignmentService.recomputeAndGetStatus).
 * Deliberately framed as a snapshot, not a promise: someone with more speedup-days can still
 * displace this player from a slot later, exactly as more speedup-days let them displace someone
 * else just now.
 */
@Component({
  selector: 'app-assignment-status-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatTooltipModule],
  templateUrl: './assignment-status-dialog.html',
  styleUrl: './assignment-status-dialog.scss',
})
export class AssignmentStatusDialogComponent {
  readonly data = inject<AssignmentStatusDialogData>(MAT_DIALOG_DATA);
}
