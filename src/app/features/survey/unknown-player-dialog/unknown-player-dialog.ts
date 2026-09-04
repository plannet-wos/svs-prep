import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface UnknownPlayerDialogData {
  /** Whatever the player typed into "Alliance and name" — shown back so the message is
   *  unambiguous about who it's talking about. */
  allianceAndName: string;
}

/**
 * Shown instead of AssignmentStatusDialogComponent when the round has SvsForm.requireKnownPlayer
 * on and this player's ID wasn't found in the shared `players` collection (see survey.ts's
 * submit() and PlayerService.exists) — their answers were still saved (with pendingApproval set),
 * but SvsAssignmentService excludes them from the appointment algorithm until an admin approves
 * them from the submissions page's "unknown players" section.
 */
@Component({
  selector: 'app-unknown-player-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  templateUrl: './unknown-player-dialog.html',
  styleUrl: './unknown-player-dialog.scss',
})
export class UnknownPlayerDialogComponent {
  readonly data = inject<UnknownPlayerDialogData>(MAT_DIALOG_DATA);
}
