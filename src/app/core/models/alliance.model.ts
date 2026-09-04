/**
 * A registered alliance in the shared tal-coordinator `alliances` collection — the canonical
 * shape and owner is foundry-planner (see its core/models/alliance.model.ts); svs-prep has no
 * alliance CRUD of its own (see auth.service.ts's doc comment) and only ever reads this
 * collection, to populate the alliance dropdown when approving a previously-unknown player (see
 * AllianceService and features/admin/form-submissions's approve-player-dialog).
 */
export interface Alliance {
  /** "{stateId}-{slug}" composite — alliance tags can repeat across states without colliding. */
  id: string;
  stateId: string;
  slug: string;
  name: string;
  /** Absent (or 'alliance') = a normal alliance. 'state_event' = a state-wide event shell with no
   *  real roster of its own — excluded from AllianceService.getAllForState's dropdown options. */
  type?: 'alliance' | 'state_event';
  createdAt: number;
}
