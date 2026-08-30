import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SVS_SUBMISSION_FIELD_LABELS, SvsSubmission } from '../../../core/models/svs-submission.model';

export interface DiffDialogData {
  before: SvsSubmission;
  after: Omit<SvsSubmission, 'createdAt' | 'updatedAt'>;
}

interface DiffRow {
  label: string;
  before: string;
  after: string;
}

@Component({
  selector: 'app-diff-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
  templateUrl: './diff-dialog.html',
  styleUrl: './diff-dialog.scss',
})
export class DiffDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<DiffDialogComponent>);
  private readonly data = inject<DiffDialogData>(MAT_DIALOG_DATA);

  readonly changes: DiffRow[] = this.computeChanges();

  private computeChanges(): DiffRow[] {
    const rows: DiffRow[] = [];
    for (const key of Object.keys(SVS_SUBMISSION_FIELD_LABELS) as (keyof typeof SVS_SUBMISSION_FIELD_LABELS)[]) {
      const before = this.data.before[key];
      const after = this.data.after[key as keyof typeof this.data.after];
      if (this.format(before) === this.format(after)) continue;
      rows.push({
        label: SVS_SUBMISSION_FIELD_LABELS[key],
        before: this.format(before),
        after: this.format(after),
      });
    }
    return rows;
  }

  private format(value: unknown): string {
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (value === '' || value === null || value === undefined) return '—';
    return String(value);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
