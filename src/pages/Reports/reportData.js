import { EntryType } from "../../utils.js";
import { dateRangeLabel } from "../../utils/finance.js";

export const monthNames = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function numberValue(value) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === "" ||
    !Number.isFinite(Number(value))
  ) {
    throw new Error("Rapor yanıtında geçersiz sayı var.");
  }
  return Number(value);
}

export function normalizeSummary(data) {
  return {
    totalIncome: numberValue(data?.totalIncome),
    totalExpense: numberValue(data?.totalExpense),
    balance: numberValue(data?.balance),
    transactionCount: numberValue(data?.transactionCount),
  };
}

export function normalizeCategories(data) {
  if (!Array.isArray(data)) throw new Error("Kategori raporu geçersiz.");
  return data
    .map((item) => {
      if (
        typeof item.categoryName !== "string" ||
        ![EntryType.Income, EntryType.Expense].includes(item.type)
      ) {
        throw new Error("Kategori raporu geçersiz.");
      }
      return {
        ...item,
        categoryId: numberValue(item.categoryId),
        total: numberValue(item.total),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function normalizeMonthly(data) {
  if (!Array.isArray(data)) throw new Error("Aylık rapor geçersiz.");
  const months = new Map();
  for (const item of data) {
    const month = numberValue(item.month);
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      months.has(month)
    )
      throw new Error("Aylık raporda geçersiz ay var.");
    months.set(month, {
      income: numberValue(item.income),
      expense: numberValue(item.expense),
    });
  }
  return monthNames.map((monthName, index) => ({
    month: index + 1,
    monthName,
    income: 0,
    expense: 0,
    ...months.get(index + 1),
  }));
}

export function categoryScope(filters) {
  const type =
    filters.type === ""
      ? "Gelir ve gider"
      : Number(filters.type) === EntryType.Income
        ? "Gelir"
        : "Gider";
  return `${dateRangeLabel(filters)} · ${type}`;
}

// Ekran, Excel ve PDF aynı satırları kullanır.
export function reportSections(data, filters) {
  return [
    {
      title: "Özet",
      scope: `${dateRangeLabel(filters)} · Tüm türler`,
      headers: ["Toplam gelir", "Toplam gider", "Bakiye", "İşlem sayısı"],
      rows: [
        [
          data.summary.totalIncome,
          data.summary.totalExpense,
          data.summary.balance,
          data.summary.transactionCount,
        ],
      ],
      moneyColumns: [0, 1, 2],
    },
    {
      title: "Kategori dağılımı",
      scope: categoryScope(filters),
      headers: ["Kategori", "Tür", "Toplam"],
      rows: data.categories.map((item) => [
        item.categoryName,
        item.type === EntryType.Income ? "Gelir" : "Gider",
        item.total,
      ]),
      moneyColumns: [2],
    },
    {
      title: "Aylık karşılaştırma",
      scope: `${filters.year} yılı · Tüm türler`,
      headers: ["Ay", "Gelir", "Gider", "Bakiye"],
      rows: data.monthly.map((item) => [
        item.monthName,
        item.income,
        item.expense,
        item.income - item.expense,
      ]),
      moneyColumns: [1, 2, 3],
    },
  ];
}
