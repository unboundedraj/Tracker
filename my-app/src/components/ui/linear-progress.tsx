type LinearProgressProps = {
  value: number; // 0..1
  label: string;
};

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function LinearProgress({ value, label }: LinearProgressProps) {
  const percent = Math.round(clamp01(value) * 100);

  return (
    <div className="linear-progress" role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="linear-progress__track">
        <div className="linear-progress__value" style={{ width: `${percent}%` }} />
      </div>
      <span className="linear-progress__text">{percent}%</span>
    </div>
  );
}
