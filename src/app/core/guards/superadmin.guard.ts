import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superadminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // Must await this first: on a fresh page load (a direct URL, a reload), Firebase Auth's
  // persisted-session restore — and the account doc's first read — are both async. Checking
  // isSuperAdmin() synchronously here can catch a genuinely signed-in user in that window and
  // wrongly bounce them to /login. See AuthService.whenReady()'s doc comment.
  await auth.whenReady();
  return auth.isSuperAdmin() || router.createUrlTree(['/login']);
};
