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

export function getDayOfMonth(date: Date): number {
  return date.getDate();
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
