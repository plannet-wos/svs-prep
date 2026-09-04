import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

const COLLECTION = 'players';

/**
 * Thin, read-mostly client for the shared `players` collection — see core/models/player.model.ts
 * for why svs-prep only ever reads id/inGameName/allianceId and writes a minimal doc. Firestore
 * rules for `players` are fully open (see plannet-wos/firestore.rules), same alliance-trust model
 * as the rest of this app's own collections.
 */
@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly firestore = inject(Firestore);

  /** Whether a known player record already exists for this ID — backs SvsForm.requireKnownPlayer's
   *  gate in survey.ts's submit(). */
  async exists(playerId: string): Promise<boolean> {
    const snap = await getDoc(doc(this.firestore, COLLECTION, playerId));
    return snap.exists();
  }

  /**
   * Creates the known-player record for a just-approved player (see features/admin/form-submissions's
   * approve flow) — merge-written so it never clobbers legion/tier/availability/etc. a sibling app
   * may already hold for this ID (shouldn't happen, since this is only ever called for an ID that
   * PlayerService.exists just reported missing, but merge costs nothing and is safer either way).
   */
  async approve(playerId: string, inGameName: string, allianceId: string): Promise<void> {
    await setDoc(
      doc(this.firestore, COLLECTION, playerId),
      { id: playerId, inGameName, allianceId, createdAt: Date.now() },
      { merge: true },
    );
  }
}
