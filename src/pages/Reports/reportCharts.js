import { EntryType } from "../../utils.js";
import { formatAmount } from "../../utils/finance.js";

export function monthlyChartOption(monthly) {
  return {
    color: ["#208456", "#d36a53", "#0d6efd"],
    tooltip: {
      trigger: "axis",
      renderMode: "richText",
      valueFormatter: formatAmount,
    },
    legend: { bottom: 0 },
    grid: { left: 12, right: 15, top: 24, bottom: 60, containLabel: true },
    xAxis: {
      type: "category",
      data: monthly.map((item) => item.monthName.slice(0, 3)),
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value) =>
          new Intl.NumberFormat("tr-TR", { notation: "compact" }).format(value),
      },
    },
    series: [
      {
        name: "Gelir",
        type: "bar",
        data: monthly.map((item) => item.income),
        barMaxWidth: 24,
      },
      {
        name: "Gider",
        type: "bar",
        data: monthly.map((item) => item.expense),
        barMaxWidth: 24,
      },
      {
        name: "Bakiye",
        type: "line",
        data: monthly.map((item) => item.income - item.expense),
        symbolSize: 6,
      },
    ],
  };
}

export function categoryChartOption(categories) {
  return {
    color: [
      "#0d6efd",
      "#208456",
      "#d36a53",
      "#8b5cc7",
      "#e1a62b",
      "#2998ac",
      "#64748b",
    ],
    tooltip: {
      trigger: "item",
      renderMode: "richText",
      valueFormatter: formatAmount,
    },
    legend: {
      type: "scroll",
      bottom: 0,
      width: "90%",
      textStyle: { width: 160, overflow: "truncate" },
    },
    series: [
      {
        name: "Kategori toplamı",
        type: "pie",
        radius: ["38%", "65%"],
        center: ["50%", "44%"],
        label: { show: false },
        emphasis: { label: { show: false } },
        data: categories.map((item) => ({
          name: `${item.categoryName} (${item.type === EntryType.Income ? "Gelir" : "Gider"})`,
          value: item.total,
        })),
      },
    ],
  };
}
