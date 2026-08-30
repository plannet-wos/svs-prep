import { Injectable, inject } from '@angular/core';
import { Firestore, addDoc, collection, doc, getDoc, getDocs, setDoc } from '@angular/fire/firestore';
import { SvsForm, SvsFormWithId, formStatus } from '../models/svs-form.model';

const COLLECTION = 'svs_forms';

@Injectable({ providedIn: 'root' })
export class SvsFormService {
  private readonly firestore = inject(Firestore);

  /**
   * All forms ever created, most recent battle date first. The collection is tiny (one doc per
   * SvS round, roughly every couple of months) so a full fetch + client-side sort is simpler
   * than an indexed query for what's effectively a handful of documents.
   */
  async getAll(): Promise<SvsFormWithId[]> {
    const snap = await getDocs(collection(this.firestore, COLLECTION));
    const forms = snap.docs.map((d) => ({ id: d.id, ...(d.data() as SvsForm) }));
    return forms.sort((a, b) => b.battleDate.localeCompare(a.battleDate));
  }

  async getById(id: string): Promise<SvsFormWithId | null> {
    const snap = await getDoc(doc(this.firestore, COLLECTION, id));
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as SvsForm) }) : null;
  }

  /** The round currently accepting submissions, if any. Latest battle date wins on overlap. */
  async getOpenForm(): Promise<SvsFormWithId | null> {
    const open = (await this.getAll()).filter((f) => formStatus(f) === 'open');
    return open[0] ?? null;
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
}
