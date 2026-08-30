import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

/** Superadmin-only login for the admin pages — see AuthService for the shared-accounts scheme. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';
  error = false;
  loading = false;

  async submit(): Promise<void> {
    if (!this.username || !this.password) return;
    this.loading = true;
    this.error = false;
    const ok = await this.auth.login(this.username, this.password);
    this.loading = false;
    if (ok) {
      this.router.navigate(['/admin']);
    } else {
      this.error = true;
      this.password = '';
      // Zoneless: nothing schedules a re-render after an await resolves on its own — without
      // this, a wrong password leaves the form stuck showing the spinner forever even though
      // this.error is now true.
      this.cdr.detectChanges();
    }
  }
}
