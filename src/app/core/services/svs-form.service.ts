import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from '@angular/fire/firestore';
import { SvsForm, SvsFormWithId } from '../models/svs-form.model';

const COLLECTION = 'svs_forms';

@Injectable({ providedIn: 'root' })
export class SvsFormService {
  private readonly firestore = inject(Firestore);

  /**
   * All forms ever created for one state, most recent battle date first. The collection is
   * tiny per state (one doc per SvS round, roughly every couple of months) so a full fetch +
   * client-side sort is simpler than an indexed query for what's effectively a handful of
   * documents. Scoped by stateId now that more than one state's rounds can exist at once —
   * see the multi-state rollout plan.
   */
  async getAllForState(stateId: string): Promise<SvsFormWithId[]> {
    const snap = await getDocs(query(collection(this.firestore, COLLECTION), where('stateId', '==', stateId)));
    const forms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SvsForm) }));
    return forms.sort((a, b) => b.battleDate.localeCompare(a.battleDate));
  }

  async getById(id: string): Promise<SvsFormWithId | null> {
    const snap = await getDoc(doc(this.firestore, COLLECTION, id));
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as SvsForm) }) : null;
  }

  /** Creates a new form and returns its generated ID. */
  async create(data: Omit<SvsForm, 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now();
    const ref = await addDoc(collection(this.firestore, COLLECTION), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
    return ref.id;
  }

  async update(id: string, data: Omit<SvsForm, 'createdAt' | 'updatedAt'>): Promise<void> {
    await setDoc(doc(this.firestore, COLLECTION, id), { ...data, updatedAt: Date.now() }, { merge: true });
  }

  /** Permanently deletes a form. Its past submissions (svs_submissions) are left untouched. */
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, COLLECTION, id));
  }
}
