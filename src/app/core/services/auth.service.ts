import { Injectable, inject } from '@angular/core';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { deriveSaltHex, hashPassword, withLoginTimeout } from '../utils/password.util';

const SESSION_KEY = 'svs_prep_session';

export interface AdminSession {
  role: 'superadmin';
  username: string;
}

/**
 * Superadmin-only login against the shared `accounts` collection (same collection and hashing
 * scheme as foundry-planner/alliance-wiki — see password.util.ts). This app has no
 * alliance-scoped admin concept, so unlike foundry-planner's AuthService there's only ever the
 * superadmin path.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private firestore = inject(Firestore);

  // Accounts are unreadable by design (see firestore.rules) — there's no backend here to check
  // credentials out-of-band, so "login" is an attempted write that only succeeds if every
  // field, crucially including passwordHash, exactly matches what's already stored (Firestore
  // rules require the write to touch nothing but `lastLoginAt`). Get the password or username
  // wrong and the whole write is rejected — that rejection is what "incorrect credentials"
  // means here.
  async login(username: string, password: string): Promise<boolean> {
    try {
      const passwordHash = await hashPassword(password, await deriveSaltHex(username));
      await withLoginTimeout(
        setDoc(doc(this.firestore, `accounts/${username}`), {
          id: username,
          username,
          role: 'superadmin',
          passwordHash,
          lastLoginAt: serverTimestamp(),
        }),
      );
      this.setSession({ role: 'superadmin', username });
      return true;
    } catch {
      return false;
    }
  }

  private setSession(session: AdminSession): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  getSession(): AdminSession | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminSession;
    } catch {
      return null;
    }
  }

  isSuperAdmin(): boolean {
    return this.getSession()?.role === 'superadmin';
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
  }
}
