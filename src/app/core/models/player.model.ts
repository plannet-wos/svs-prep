/**
 * A known player in the shared tal-coordinator `players` collection — its canonical shape and
 * owner is foundry-planner (see its core/models/player.model.ts and player.service.ts); Firestore
 * rules for it are wide open (`allow read, write: if true`, see plannet-wos/firestore.rules), the
 * same alliance-trust model every collection in this shared project uses.
 *
 * svs-prep only ever reads `id`/`inGameName`/`allianceId` (to power SvsForm.requireKnownPlayer's
 * "is this player ID known" check — see PlayerService.exists), and on approving a previously-
 * unknown player (features/admin/form-submissions's approve flow) writes only those three fields
 * plus `createdAt`, merged rather than overwritten — deliberately NOT the fuller foundry-planner
 * shape (availability/legion/tier/etc.), which that app already defaults gracefully for a player
 * record that's missing them (same as any player who's never opened foundry-planner at all).
 */
export interface Player {
  /** In-game player ID — Firestore document ID, same value as SvsSubmission.playerId. */
  id: string;
  inGameName: string;
  /** Composite "{stateId}-{slug}" — see alliance.model.ts. */
  allianceId: string;
  createdAt?: number;
}
