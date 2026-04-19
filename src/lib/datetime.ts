import dayjs from "dayjs";

export function getFullYear(d: Date | string): number {
  const dayJsDate = dayjs(d);
  if (!dayJsDate.isValid()) {
    throw new Error(`Invalid date: ${d}`);
  }
  return dayJsDate.year();
}
