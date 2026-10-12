const money = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
});

export const formatMoney = (n: number) => money.format(n);

// Uses the local date (not UTC), so it's correct right after midnight in Sri Lanka
export const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const currentMonth = () => today().slice(0, 7); // "YYYY-MM"

export const monthLabel = (month: string, short = false) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: short ? "short" : "long",
    year: short ? "2-digit" : "numeric",
  });
};

export const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
