import { formatAmount } from "../../utils/finance.js";

function csvCell(value) {
  let text =
    typeof value === "number"
      ? String(value).replace(".", ",")
      : String(value ?? "");
  // Keep names as text instead of executable spreadsheet formulas.
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r\n]/.test(text))
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function createCsv(sections) {
  const rows = [
    [
      "Rapor",
      "Kapsam",
      "Kategori / Ay",
      "Tür",
      "Gelir",
      "Gider",
      "Bakiye",
      "İşlem sayısı",
      "Toplam",
    ],
  ];
  for (const section of sections) {
    for (const row of section.rows) {
      const values =
        section.title === "Özet"
          ? ["Genel toplam", "", ...row, ""]
          : section.title === "Kategori dağılımı"
            ? [row[0], row[1], "", "", "", "", row[2]]
            : [row[0], "", row[1], row[2], row[3], "", ""];
      rows.push([section.title, section.scope, ...values]);
    }
    if (section.rows.length === 0)
      rows.push([
        section.title,
        section.scope,
        "Kayıt bulunamadı",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

export async function createWorkbook(sections) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Finans Takip Sistemi";
  workbook.created = new Date();
  for (const section of sections) {
    const sheet = workbook.addWorksheet(section.title);
    sheet.addRow([section.title]);
    sheet.addRow([section.scope]);
    sheet.mergeCells(1, 1, 1, section.headers.length);
    sheet.mergeCells(2, 1, 2, section.headers.length);
    sheet.addRow([]);
    sheet.addRow(section.headers);
    section.rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = {
      bold: true,
      size: 16,
      color: { argb: "FF24324A" },
    };
    sheet.getRow(2).alignment = { wrapText: true };
    sheet.getRow(2).height = 32;
    sheet.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(4).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0D6EFD" },
    };
    sheet.columns.forEach((column, index) => {
      column.width = index === 0 ? 32 : 22;
      column.alignment = { vertical: "middle", wrapText: true };
    });
    for (let row = 5; row <= sheet.rowCount; row++) {
      section.moneyColumns.forEach((column) => {
        sheet.getCell(row, column + 1).numFmt = "#,##0.00;[Red]-#,##0.00";
      });
    }
    sheet.views = [{ state: "frozen", ySplit: 4 }];
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: Math.max(4, sheet.rowCount), column: section.headers.length },
    };
    sheet.pageSetup = {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
  }
  return workbook.xlsx.writeBuffer();
}

export function createPdfDefinition(sections, images = {}) {
  const content = [
    { text: "Finans raporu", style: "title" },
    {
      text: `Oluşturulma: ${new Date().toLocaleString("tr-TR")}`,
      style: "muted",
    },
  ];
  const orderedSections = [sections[0], sections[2], sections[1]].filter(
    Boolean,
  );
  orderedSections.forEach((section) => {
    content.push({
      text: section.title,
      style: "heading",
      ...(section.title === "Kategori dağılımı" ? { pageBreak: "before" } : {}),
    });
    content.push({ text: section.scope, style: "muted" });
    if (images[section.title])
      content.push({
        image: images[section.title],
        fit: [510, 180],
        alignment: "center",
        margin: [0, 8, 0, 16],
      });
    if (section.rows.length === 0) {
      content.push({
        text: "Bu kapsamda kayıt bulunamadı.",
        margin: [0, 12, 0, 0],
      });
      return;
    }
    content.push({
      table: {
        headerRows: 1,
        widths:
          section.title === "Kategori dağılımı"
            ? ["*", 65, 110]
            : section.headers.map(() => "*"),
        body: [
          section.headers.map((text) => ({
            text,
            bold: true,
            fillColor: "#edf3ff",
          })),
          ...section.rows.map((row) =>
            row.map((value, column) => ({
              text: section.moneyColumns.includes(column)
                ? formatAmount(value)
                : String(value),
              alignment: typeof value === "number" ? "right" : "left",
            })),
          ),
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 12, 0, 0],
    });
  });
  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 45],
    info: { title: "Finans raporu", author: "Finans Takip Sistemi" },
    defaultStyle: { font: "Roboto", fontSize: 10, color: "#24324a" },
    styles: {
      title: { fontSize: 22, bold: true, margin: [0, 0, 0, 8] },
      heading: { fontSize: 16, bold: true, margin: [0, 16, 0, 8] },
      muted: { color: "#65748a", fontSize: 9, margin: [0, 0, 0, 8] },
    },
    footer: (currentPage, pageCount) => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: "center",
      fontSize: 9,
      margin: [0, 15, 0, 0],
    }),
    content,
  };
}

export async function createPdf(sections, images) {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([
    import("pdfmake/build/pdfmake.js"),
    import("pdfmake/build/vfs_fonts.js"),
  ]);
  pdfMake.addVirtualFileSystem(fonts);
  return pdfMake.createPdf(createPdfDefinition(sections, images)).getBlob();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function downloadReportFile(format, sections, images) {
  let blob;
  if (format === "csv")
    blob = new Blob([createCsv(sections)], { type: "text/csv;charset=utf-8" });
  else if (format === "xlsx")
    blob = new Blob([await createWorkbook(sections)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  else if (format === "pdf") blob = await createPdf(sections, images);
  else throw new Error("Desteklenmeyen dosya türü.");
  downloadBlob(
    blob,
    `finans-raporu-${new Date().toISOString().slice(0, 10)}.${format}`,
  );
}
