import { monthLabel } from "../format";

function shift(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="month-picker">
      <button className="icon-btn" onClick={() => onChange(shift(value, -1))} aria-label="Previous month">‹</button>
      <span>{monthLabel(value)}</span>
      <button className="icon-btn" onClick={() => onChange(shift(value, 1))} aria-label="Next month">›</button>
    </div>
  );
}
