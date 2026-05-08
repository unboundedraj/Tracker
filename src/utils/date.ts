export type MonthKey = `${number}-${string}`;

export function getMonthKey(date: Date): MonthKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getDaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getDaysInMonthFromMonthKey(monthKey: string): number {
  const monthStart = getMonthStartDateFromMonthKey(monthKey);
  const year = monthStart.getUTCFullYear();
  const monthIndex = monthStart.getUTCMonth();
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function getDayOfMonth(date: Date): number {
  return date.getDate();
}

export function getMonthStartDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
}

export function getMonthStartDateFromMonthKey(monthKey: string): Date {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  return new Date(Date.UTC(year, month - 1, 1));
}

export type WeekColumn = {
  index: number;
  label: string;
  startDay: number;
  endDay: number;
  days: number[];
};

export function getMonthWeekColumns(daysInMonth: number): WeekColumn[] {
  const ranges: Array<[number, number]> = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 28],
    [29, daysInMonth],
  ];

  return ranges
    .map(([startDay, endDay], index) => {
      const clampedEnd = Math.min(endDay, daysInMonth);
      const days: number[] = [];

      for (let day = startDay; day <= clampedEnd; day += 1) {
        days.push(day);
      }

      return {
        index,
        label: `Week ${index + 1}`,
        startDay,
        endDay: clampedEnd,
        days,
      } satisfies WeekColumn;
    })
    .filter((column) => column.days.length > 0);
}

export function getDaysElapsed(isoDateString: string): number {
  const createdDate = new Date(isoDateString);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
