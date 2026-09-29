import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  normalizeSummary,
  normalizeCategories,
  normalizeMonthly,
  reportSections,
} from "../src/pages/Reports/reportData.js";
import {
  createCsv,
  createWorkbook,
  createPdf,
  createPdfDefinition,
} from "../src/pages/Reports/reportExport.js";
import { dateRangeParams, localDateValue } from "../src/utils/finance.js";

const filters = { from: "2026-01-01", to: "2026-09-29", year: 2025, type: "2" };
const data = {
  summary: normalizeSummary({
    totalIncome: "1000.25",
    totalExpense: "1200.5",
    balance: "-200.25",
    transactionCount: "3",
  }),
  categories: normalizeCategories([
    {
      categoryId: "2",
      categoryName: '=Özel; "İşlem"\nİkinci satır',
      type: 2,
      total: "1200.5",
    },
  ]),
  monthly: normalizeMonthly([
    { month: "3", monthName: "March", income: "1000.25", expense: "1200.5" },
  ]),
};
const sections = reportSections(data, filters);

test("API numeric strings are numbers; missing months are filled and sorted", () => {
  assert.equal(data.summary.balance, -200.25);
  assert.equal(data.categories[0].categoryId, 2);
  assert.equal(data.monthly.length, 12);
  assert.equal(data.monthly[0].income, 0);
  assert.equal(data.monthly[2].monthName, "Mart");
  assert.equal(data.monthly[2].income, 1000.25);
  assert.throws(() => normalizeSummary({ totalIncome: null }));
  assert.throws(() => normalizeMonthly([{ month: 13, income: 0, expense: 0 }]));
  assert.throws(() =>
    normalizeMonthly([
      { month: 1, income: 0, expense: 0 },
      { month: 1, income: 0, expense: 0 },
    ]),
  );
  assert.throws(() =>
    normalizeCategories([
      { categoryId: 1, categoryName: "Test", type: 2, total: "bad" },
    ]),
  );
});

test("date bounds include entire local day and use RFC 3339", () => {
  const params = dateRangeParams({ from: "2026-09-01", to: "2026-09-29" });
  const from = new Date(params.from);
  const to = new Date(params.to);
  assert.equal(from.getDate(), 1);
  assert.equal(from.getHours(), 0);
  assert.equal(to.getDate(), 29);
  assert.equal(to.getHours(), 23);
  assert.equal(to.getMilliseconds(), 999);
  assert.match(params.from, /Z$/);
  assert.equal(localDateValue(from), "2026-09-01");
  assert.deepEqual(dateRangeParams({}), {});
});

test("exports state independent date/type/year scopes and preserve negative balance", () => {
  assert.match(sections[0].scope, /Tüm türler/);
  assert.match(sections[1].scope, /Gider/);
  assert.equal(sections[2].scope, "2025 yılı · Tüm türler");
  assert.equal(sections[2].rows[2][3], -200.25);
});

test("CSV preserves Turkish text, quotes, multiline names and neutralizes formulas", () => {
  const csv = createCsv(sections);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes('"\'=Özel; ""İşlem""\nİkinci satır"'));
  assert.ok(csv.includes('"-200,25"'));
  assert.ok(csv.includes('"2025 yılı · Tüm türler"'));
  assert.ok(
    createCsv([{ ...sections[1], rows: [] }]).includes("Kayıt bulunamadı"),
  );
});

test("Excel is a readable workbook with numeric amounts and literal names", async () => {
  const buffer = await createWorkbook(sections);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.equal(workbook.worksheets.length, 3);
  assert.equal(workbook.worksheets[0].getCell("C5").value, -200.25);
  assert.equal(
    workbook.worksheets[1].getCell("A5").value,
    data.categories[0].categoryName,
  );
  assert.equal(workbook.worksheets[1].getCell("C5").value, 1200.5);
  assert.equal(workbook.worksheets[2].getCell("B7").value, 1000.25);
  assert.equal(workbook.worksheets[2].getCell("D7").value, -200.25);
});

test("PDF generation produces a document with repeating table headers and Turkish font", async () => {
  const definition = createPdfDefinition(sections);
  assert.equal(definition.defaultStyle.font, "Roboto");
  assert.equal(definition.content.filter((item) => item.table).length, 3);
  assert.ok(
    definition.content
      .filter((item) => item.table)
      .every((item) => item.table.headerRows === 1),
  );
  const blob = await createPdf(sections);
  assert.equal((await blob.text()).slice(0, 5), "%PDF-");
  assert.ok(blob.size > 10000);
});

test("empty reports still export valid Excel and PDF documents", async () => {
  const empty = reportSections(
    {
      summary: normalizeSummary({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        transactionCount: 0,
      }),
      categories: [],
      monthly: normalizeMonthly([]),
    },
    filters,
  );
  assert.ok((await createWorkbook(empty)).byteLength > 0);
  assert.ok((await createPdf(empty)).size > 0);
});
