export const amountFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(value) {
  return amountFormatter.format(value);
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("tr-TR");
}

export function localDateValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateRangeParams({ from, to }) {
  const params = {};
  if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
  if (to) params.to = new Date(`${to}T23:59:59.999`).toISOString();
  return params;
}

export function dateRangeLabel({ from, to }) {
  if (!from && !to) return "Tüm zamanlar";
  return `${from ? formatDate(`${from}T00:00:00`) : "Başlangıçtan"} – ${to ? formatDate(`${to}T00:00:00`) : "Bitiş sınırı yok"}`;
}
