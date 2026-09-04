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
 * State_admin-or-above login — see AuthService for the shared-accounts scheme, now backed by
 * real Firebase Auth. A successful login lands on the signed-in account's OWN state's admin
 * list (state_admin/its stateId), or state 3038 for superadmin — that rank is global with no
 * home state of its own, and 3038 is still "the only state that existed pre-rollout" default
 * used elsewhere; superadmin can switch states by editing the URL.
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
      await this.auth.whenReady(); // ensures account() reflects the just-signed-in user, not the previous (usually null) one
      this.router.navigate([this.auth.account()?.stateId ?? '3038', 'admin']);
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
      await this.auth.whenReady(); // see submit()'s comment
      this.router.navigate([this.auth.account()?.stateId ?? '3038', 'admin']);
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

  // --- forgot password ---
  showForgotPassword = false;
  resetEmail = '';
  resetSent = false;

  openForgotPassword(): void {
    this.resetEmail = this.email;
    this.resetSent = false;
    this.error = false;
    this.showForgotPassword = true;
  }

  cancelForgotPassword(): void {
    this.showForgotPassword = false;
    this.resetSent = false;
  }

  async sendPasswordReset(): Promise<void> {
    if (!this.resetEmail) return;
    this.loading = true;
    this.error = false;
    try {
      await this.auth.sendPasswordReset(this.resetEmail);
    } catch (err) {
      if ((err as { code?: string }).code !== 'auth/user-not-found') {
        this.error = true;
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }
    }
    this.resetSent = true;
    this.loading = false;
    this.cdr.detectChanges();
  }
}
