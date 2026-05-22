import { toZonedTime, fromZonedTime, format } from "date-fns-tz";
import { startOfDay, startOfWeek, addDays } from "date-fns";

export const TZ = "America/Bogota";

export function nowLocal(): Date {
  return toZonedTime(new Date(), TZ);
}
export function localDay(d: Date | string = new Date()): string {
  return format(toZonedTime(new Date(d), TZ), "yyyy-MM-dd", { timeZone: TZ });
}
export function startOfLocalDay(d: Date | string = new Date()): Date {
  return fromZonedTime(startOfDay(toZonedTime(new Date(d), TZ)), TZ);
}
export function startOfLocalWeek(d: Date | string = new Date()): Date {
  const zoned = toZonedTime(new Date(d), TZ);
  return fromZonedTime(startOfWeek(zoned, { weekStartsOn: 1 }), TZ);
}
export function fmtTime(d: Date | string): string {
  return format(toZonedTime(new Date(d), TZ), "HH:mm", { timeZone: TZ });
}
export function dayPart(d: Date | string): "morning" | "afternoon" | "night" {
  const h = toZonedTime(new Date(d), TZ).getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "night";
}
export { addDays };
