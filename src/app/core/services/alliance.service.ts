import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Alliance } from '../models/alliance.model';

const COLLECTION = 'alliances';

/** Read-only client for the shared `alliances` collection — see core/models/alliance.model.ts. */
@Injectable({ providedIn: 'root' })
export class AllianceService {
  private readonly firestore = inject(Firestore);

  /** Every real alliance (state-event shells excluded) in one state, name-sorted — populates the
   *  approve-player-dialog's alliance dropdown. */
  async getAllForState(stateId: string): Promise<Alliance[]> {
    const snap = await getDocs(
      query(collection(this.firestore, COLLECTION), where('stateId', '==', stateId)),
    );
    return snap.docs
      .map((d) => d.data() as Alliance)
      .filter((a) => a.type !== 'state_event')
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
