export function createBitstring(length: number, fill: "0" | "1" = "0"): string {
  return new Array(length).fill(fill).join("");
}

export function isBitstring(value: string, expectedLength: number): boolean {
  return value.length === expectedLength && /^[01]+$/.test(value);
}

export function toggleBitAtIndex(value: string, index: number): string {
  if (index < 0 || index >= value.length) {
    return value;
  }

  const current = value[index];
  const next = current === "1" ? "0" : "1";
  return `${value.slice(0, index)}${next}${value.slice(index + 1)}`;
}

export function countOnes(value: string, endExclusive?: number): number {
  const slice = typeof endExclusive === "number" ? value.slice(0, endExclusive) : value;
  let count = 0;

  for (const char of slice) {
    if (char === "1") {
      count += 1;
    }
  }

  return count;
}
