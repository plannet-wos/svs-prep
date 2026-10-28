import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RANK } from '../constants/roles';

/**
 * State-scoped admin surfaces (the `/:stateId/admin*` pages): rank must be state_admin or
 * above, AND — except superadmin, who is global — the account's own stateId must match the
 * route's `:stateId`. Widened from the original superadmin-only gate so a state's own admin
 * can manage SvS prep rounds without going through superadmin every time — see the svs_forms
 * rule in firestore.rules, which is the real enforcement; this guard is client-side UX only.
 * Kept the export name `superadminGuard` — every route already imports it under that name.
 */
export const superadminGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // Must await this first: on a fresh page load (a direct URL, a reload), Firebase Auth's
  // persisted-session restore — and the account doc's first read — are both async. Checking
  // rank()/isActive() synchronously here can catch a genuinely signed-in user in that window
  // and wrongly bounce them to /login. See AuthService.whenReady()'s doc comment.
  await auth.whenReady();

  const account = auth.account();
  const rank = auth.rank();
  if (!auth.isActive() || rank === null || account === null) return router.createUrlTree(['/login']);
  if (rank > RANK.STATE_ADMIN) return router.createUrlTree(['/login']);
  if (rank === RANK.SUPERADMIN) return true;

  const stateId = route.paramMap.get('stateId');
  return account.stateId === stateId || router.createUrlTree(['/login']);
};
