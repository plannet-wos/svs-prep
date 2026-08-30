/**
 * The fixed 48-slot appointment grid: 24 hours UTC, 30-minute slots, grouped
 * into 8 three-hour blocks for display. This never changes between rounds
 * (unlike svs-round.config.ts) — it mirrors ALL_SLOTS/BLOCK_TO_SLOTS in
 * Documents/SVS/assign_appointments.py exactly, so a submission's
 * `availableTimes` here is already the same "preferred slots" list that
 * script's assignment algorithm expects, with no block-to-slot expansion
 * step needed when that algorithm gets ported into the app.
 */

export interface SlotGroup {
  /** e.g. "00 - 03 UTC" */
  label: string;
  /** The 6 half-hour slots in this block, e.g. ["00:00", "00:30", ..., "02:30"]. */
  slots: string[];
}

function buildSlotGroups(): SlotGroup[] {
  const groups: SlotGroup[] = [];
  for (let blockStart = 0; blockStart < 24; blockStart += 3) {
    const slots: string[] = [];
    for (let offset = 0; offset < 180; offset += 30) {
      const totalMinutes = blockStart * 60 + offset;
      const hh = Math.floor(totalMinutes / 60);
      const mm = totalMinutes % 60;
      slots.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
    const blockEnd = blockStart + 3;
    groups.push({
      label: `${String(blockStart).padStart(2, '0')} - ${String(blockEnd).padStart(2, '0')} UTC`,
      slots,
    });
  }
  return groups;
}

export const SLOT_GROUPS: SlotGroup[] = buildSlotGroups();
export const ALL_SLOTS: string[] = SLOT_GROUPS.flatMap((g) => g.slots);
