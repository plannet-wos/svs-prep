import { Component, Input, inject } from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ALL_SLOTS, SLOT_GROUPS, SlotGroup } from '../../../core/config/slot-grid';

/**
 * A 48-slot (8 groups x 6 half-hour slots) availability picker, reused once
 * per day (Construction/Research/Training) in the survey. Implements
 * ControlValueAccessor so it plugs into a reactive form exactly like a
 * native input — `formControlName="availableTimesConstruction"` etc.
 *
 * Deliberately does NOT provide NG_VALUE_ACCESSOR via the DI token (the
 * "textbook" CVA pattern) — combining that with self-injecting NgControl
 * below causes NG0200 (circular dependency), since the directive would need
 * to resolve the provider before the component that provides it exists.
 * Instead this wires itself in directly, which is the pattern Angular's own
 * docs recommend for host-directive-free custom controls.
 *
 * Validation (e.g. "at least 5 slots") lives on the FormControl itself (see
 * survey.ts), same as any other field; this component just reads its own
 * NgControl to know when to show the error.
 */
@Component({
  selector: 'app-day-availability-picker',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './day-availability-picker.html',
  styleUrl: './day-availability-picker.scss',
})
export class DayAvailabilityPickerComponent implements ControlValueAccessor {
  @Input() minSlots = 5;

  readonly slotGroups = SLOT_GROUPS;
  readonly localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  private readonly ngControl = inject(NgControl, { self: true, optional: true });

  value: string[] = [];
  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};
  disabled = false;

  constructor() {
    if (this.ngControl) this.ngControl.valueAccessor = this;
  }

  writeValue(value: string[] | null): void {
    this.value = value ?? [];
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  get showError(): boolean {
    const control = this.ngControl?.control;
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  private emit(next: string[]): void {
    this.value = next;
    this.onChange(next);
    this.onTouched();
  }

  private setSlots(slots: readonly string[], selected: boolean): void {
    const current = new Set(this.value);
    for (const slot of slots) {
      if (selected) current.add(slot);
      else current.delete(slot);
    }
    this.emit(Array.from(current));
  }

  toggleSlot(slot: string, checked: boolean): void {
    this.setSlots([slot], checked);
  }

  isSlotChecked(slot: string): boolean {
    return this.value.includes(slot);
  }

  toggleGroup(group: SlotGroup): void {
    this.setSlots(group.slots, this.groupState(group) !== 'all');
  }

  groupState(group: SlotGroup): 'all' | 'some' | 'none' {
    const selected = group.slots.filter((s) => this.isSlotChecked(s)).length;
    if (selected === 0) return 'none';
    return selected === group.slots.length ? 'all' : 'some';
  }

  selectAll(): void {
    this.setSlots(ALL_SLOTS, true);
  }

  clearAll(): void {
    this.emit([]);
  }

  /** e.g. "09 - 12 UTC" -> "2:00 – 5:00 AM" in the browser's local timezone. */
  localGroupRangeLabel(group: SlotGroup): string {
    const match = group.label.match(/^(\d{2}) - (\d{2})/);
    if (!match) return '';
    const [, startStr, endStr] = match;
    return `${this.localHourLabel(Number(startStr))} – ${this.localHourLabel(Number(endStr))}`;
  }

  /** e.g. "09:00" -> "11:00 AM" in the browser's local timezone (for the per-slot tooltip). */
  localSlotLabel(slot: string): string {
    const [h, m] = slot.split(':').map(Number);
    const today = new Date();
    return new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), h, m),
    ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  private localHourLabel(hour: number): string {
    const today = new Date();
    return new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hour),
    ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}
