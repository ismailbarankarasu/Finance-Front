import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseSync } from "@babel/core";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Run the actual loader bodies with controlled API responses and state setters.
async function loaderBody(file, name) {
  const source = await readFile(new URL(`../src/${file}`, import.meta.url), "utf8");
  const ast = parseSync(source, { parserOpts: { plugins: ["jsx"] } });
  let body;
  function visit(node) {
    if (!node || typeof node !== "object" || body) return;
    if (node.type === "FunctionDeclaration" && node.id?.name === name) {
      body = node.body;
    } else if (node.type === "VariableDeclarator" && node.id.name === name) {
      body = node.init.arguments?.[0]?.body;
    }
    if (!body) {
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    }
  }
  visit(ast);
  assert.ok(body, `${name} bulunamadı`);
  return source.slice(body.start + 1, body.end - 1);
}

const loaders = [
  ["pages/Accounts/AccountsPage.jsx", "loadAccounts"],
  ["pages/Counterparties/CounterpartiesPage.jsx", "loadParties"],
  ["pages/Inventory/InventoryPage.jsx", "loadData"],
  ["pages/Invoices/InvoicesPage.jsx", "loadData"],
  ["pages/Journal/JournalPage.jsx", "loadData"],
  ["pages/Payments/PaymentsPage.jsx", "loadBaseData"],
  ["pages/Products/ProductsPage.jsx", "loadData"],
  ["pages/Transfers/TransfersPage.jsx", "loadData"],
  ["pages/Treasury/TreasuryPage.jsx", "loadData"],
  ["pages/Reports/ReportsPage.jsx", "loadReport"],
  ["pages/Administration/AdministrationPage.jsx", "loadMembers"],
  ["pages/Administration/AdministrationPage.jsx", "loadAudit"],
  ["pages/Administration/AdministrationPage.jsx", "loadMessages"],
  ["pages/Administration/AdministrationPage.jsx", "loadSettings"],
  ["context/AccountingContext.jsx", "loadCompanies"],
  ["context/AccountingContext.jsx", "loadPeriods"],
];

for (const [file, name] of loaders) {
  test(`${file}: canceled request cannot commit a late response or error`, async () => {
    const body = await loaderBody(file, name);
    for (const rejectResponse of [false, true]) {
      const controller = new AbortController();
      let finish;
      const pending = new Promise((resolve, reject) => {
        finish = () => rejectResponse
          ? reject(new Error("Gecikmiş API hatası"))
          : resolve({ data: [] });
      });
      const updates = [];
      const context = {
        api: { get: () => pending },
        activeCompanyId: 1, activePeriodId: 2, companyId: 1,
        signal: controller.signal, isAdmin: true, canAudit: true,
        appliedSearch: "", appliedType: "", page: 1, pageSize: 20,
        auditFilter: { entityType: "", from: "", to: "" },
        messageStatus: "", from: "", to: "", reportType: "trial-balance",
        REPORT_TYPES: { reconciliation: "reconciliation", balance: "balance-sheet" },
      };
      const setters = new Set(body.match(/\bset[A-Z]\w*/g) ?? []);
      for (const setter of setters) {
        context[setter] = value => updates.push([setter, value]);
      }
      const run = new AsyncFunction(...Object.keys(context), body);
      const result = run(...Object.values(context));
      const beforeAbort = [...updates];
      controller.abort();
      finish();
      await result;
      assert.deepEqual(updates, beforeAbort);
    }
  });
}
