import { DEFAULT_SETTINGS } from './seed';

export type DeliverySchedule = {
  deliveryStartHour?: number;
  deliveryEndHour?: number;
  deliverySlotMinutes?: number;
  deliveryMaxDays?: number;
  deliveryLeadDays?: number;
};

function clampHour(h: number, fallback: number) {
  if (!Number.isFinite(h)) return fallback;
  return Math.min(23, Math.max(0, Math.floor(h)));
}

/** 依後台設定產生配送時段列表 */
export function buildDeliveryTimeSlots(schedule?: DeliverySchedule): string[] {
  const start = clampHour(schedule?.deliveryStartHour ?? DEFAULT_SETTINGS.deliveryStartHour, 9);
  const end = clampHour(schedule?.deliveryEndHour ?? DEFAULT_SETTINGS.deliveryEndHour, 20);
  const step = schedule?.deliverySlotMinutes === 60 ? 60 : 30;
  const slots: string[] = [];
  const endMin = end * 60;
  for (let m = start * 60; m <= endMin; m += step) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 23) break;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots.length ? slots : ['09:00'];
}

/** 相容舊程式：預設時段 */
export const DELIVERY_TIME_SLOTS = buildDeliveryTimeSlots();

export function minDeliveryDate(leadDays = DEFAULT_SETTINGS.deliveryLeadDays): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(0, leadDays));
  return d.toISOString().slice(0, 10);
}

export function maxDeliveryDate(maxDays = DEFAULT_SETTINGS.deliveryMaxDays): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, maxDays));
  return d.toISOString().slice(0, 10);
}

export function deliveryDateBounds(schedule?: DeliverySchedule) {
  const lead = schedule?.deliveryLeadDays ?? DEFAULT_SETTINGS.deliveryLeadDays;
  const max = schedule?.deliveryMaxDays ?? DEFAULT_SETTINGS.deliveryMaxDays;
  return {
    min: minDeliveryDate(lead),
    max: maxDeliveryDate(max),
  };
}
