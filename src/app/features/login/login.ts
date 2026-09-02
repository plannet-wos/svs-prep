import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MultiFactorResolver } from 'firebase/auth';
import { AuthService, MfaRequiredError } from '../../core/services/auth.service';

/**
 * Superadmin-only login — see AuthService for the shared-accounts scheme, now backed by real
 * Firebase Auth. There's no state picker here yet (svs-prep has no per-state admin concept
 * of its own — superadmin is global): a successful login lands on state 3038's admin list,
 * same "only state that exists yet" default used elsewhere in the rollout — switch states by
 * editing the URL until this page grows a real switcher.
 */
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

  email = '';
  password = '';
  otp = '';
  error = false;
  loading = false;
  pendingMfaResolver = signal<MultiFactorResolver | null>(null);

  async submit(): Promise<void> {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error = false;
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['3038', 'admin']);
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        this.pendingMfaResolver.set(err.resolver);
      } else {
        this.error = true;
        this.password = '';
      }
    } finally {
      this.loading = false;
      // Zoneless: nothing schedules a re-render after an await resolves on its own.
      this.cdr.detectChanges();
    }
  }

  async submitOtp(): Promise<void> {
    const resolver = this.pendingMfaResolver();
    if (!resolver || !this.otp) return;
    this.loading = true;
    this.error = false;
    try {
      await this.auth.completeMfaSignIn(resolver, this.otp);
      this.router.navigate(['3038', 'admin']);
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  cancelMfa(): void {
    this.pendingMfaResolver.set(null);
    this.otp = '';
    this.error = false;
  }
}
