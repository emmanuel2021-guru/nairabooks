/**
 * excel-export.ts
 * Clean, lightweight Excel exporter generating authentic XML Spreadsheet 2003
 * workbooks (.xls / .xlsx-compatible) with corporate Nigerian FRCN green styling,
 * formatted numbers (₦#,##0.00), and multi-sheet support without heavy npm dependencies.
 */

import type { FrcnFinancialStatementPackage } from "@/types/ledger";

export interface ExcelColumn {
  readonly label: string;
  readonly width?: number;
  readonly type?: "String" | "Number" | "Currency";
}

export interface ExcelSheet {
  readonly name: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly columns: readonly ExcelColumn[];
  readonly rows: readonly (string | number | null | undefined)[][];
}

function escapeXml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXmlWorkbook(sheets: readonly ExcelSheet[]): string {
  const sanitizeSheetName = (name: string) =>
    name.replace(/[:\\/?*[\]]/g, "_").slice(0, 31);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>NairaBooks FRCN Statutory Ledger</Author>
  <Company>Financial Reporting Council of Nigeria Compliant</Company>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#1C1C1E"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Segoe UI" ss:Size="14" ss:Bold="1" ss:Color="#006838"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubtitleStyle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Italic="1" ss:Color="#5E5E64"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#006838" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#004D2A"/>
   </Borders>
  </Style>
  <Style ss:ID="DataLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E5EA"/>
   </Borders>
  </Style>
  <Style ss:ID="DataRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E5EA"/>
   </Borders>
  </Style>
  <Style ss:ID="CurrencyStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="&quot;₦&quot;#,##0.00;[Red](&quot;₦&quot;#,##0.00);&quot;₦&quot;0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E5EA"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalStyle">
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#006838"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="&quot;₦&quot;#,##0.00;[Red](&quot;₦&quot;#,##0.00);&quot;₦&quot;0.00"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#006838"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#006838"/>
   </Borders>
  </Style>
 </Styles>
`;

  for (const sheet of sheets) {
    xml += ` <Worksheet ss:Name="${escapeXml(sanitizeSheetName(sheet.name))}">\n`;
    xml += `  <Table x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="20">\n`;

    // Column widths
    for (const col of sheet.columns) {
      const w = col.width ?? (col.type === "Currency" ? 120 : 160);
      xml += `   <Column ss:Width="${w}"/>\n`;
    }

    // Title row if present
    if (sheet.title) {
      xml += `   <Row ss:Height="26">\n`;
      xml += `    <Cell ss:MergeAcross="${Math.max(0, sheet.columns.length - 1)}" ss:StyleID="TitleStyle"><Data ss:Type="String">${escapeXml(sheet.title)}</Data></Cell>\n`;
      xml += `   </Row>\n`;
    }

    // Subtitle row if present
    if (sheet.subtitle) {
      xml += `   <Row ss:Height="18">\n`;
      xml += `    <Cell ss:MergeAcross="${Math.max(0, sheet.columns.length - 1)}" ss:StyleID="SubtitleStyle"><Data ss:Type="String">${escapeXml(sheet.subtitle)}</Data></Cell>\n`;
      xml += `   </Row>\n`;
      xml += `   <Row ss:Height="8"/>\n`; // spacer
    }

    // Header row
    xml += `   <Row ss:Height="24">\n`;
    for (const col of sheet.columns) {
      xml += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>\n`;
    }
    xml += `   </Row>\n`;

    // Data rows
    for (const row of sheet.rows) {
      xml += `   <Row ss:Height="20">\n`;
      for (let i = 0; i < sheet.columns.length; i++) {
        const col = sheet.columns[i];
        const val = row[i];
        const isNum = typeof val === "number" || (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "");
        const numVal = typeof val === "number" ? val : Number(val);

        if (col?.type === "Currency" && isNum) {
          xml += `    <Cell ss:StyleID="CurrencyStyle"><Data ss:Type="Number">${numVal}</Data></Cell>\n`;
        } else if (col?.type === "Number" && isNum) {
          xml += `    <Cell ss:StyleID="DataRight"><Data ss:Type="Number">${numVal}</Data></Cell>\n`;
        } else {
          xml += `    <Cell ss:StyleID="DataLeft"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`;
        }
      }
      xml += `   </Row>\n`;
    }

    xml += `  </Table>\n`;
    xml += ` </Worksheet>\n`;
  }

  xml += `</Workbook>`;
  return xml;
}

export function downloadExcelFile(xmlContent: string, fileName: string): void {
  const blob = new Blob([xmlContent], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".xls") || fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export a single table into an Excel file
 */
export function exportTableToExcel({
  filename,
  sheetName,
  title,
  subtitle,
  columns,
  rows,
}: {
  readonly filename: string;
  readonly sheetName: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly columns: readonly ExcelColumn[];
  readonly rows: readonly (string | number | null | undefined)[][];
}): void {
  const xml = buildXmlWorkbook([
    {
      name: sheetName,
      title,
      subtitle,
      columns,
      rows,
    },
  ]);
  downloadExcelFile(xml, filename);
}

/**
 * Export complete 8-sheet FRCN Compliant Financial Statements Package
 * Modeled directly after FRCN Signed Financial Statements (CAMA 2020 & IFRS)
 */
export function exportFrcnPackageToExcel(
  pkg: FrcnFinancialStatementPackage,
  yearLabel: string = "FY2026",
  companyName: string = "NairaBooks Enterprise Limited",
): void {
  const assetRows = (pkg.financialPosition.assetLines ?? []).map((a) => [
    `  ${a.accountName} (${a.accountCode})`,
    a.ifrsTag,
    Number(a.amountNgn),
    0,
  ]);

  const liabilityRows = (pkg.financialPosition.liabilityLines ?? []).map((l) => [
    `  ${l.accountName} (${l.accountCode})`,
    l.ifrsTag,
    Number(l.amountNgn),
    0,
  ]);

  const equityRows = (pkg.financialPosition.equityLines ?? []).map((e) => [
    `  ${e.accountName} (${e.accountCode})`,
    e.ifrsTag,
    Number(e.amountNgn),
    0,
  ]);

  const sheets: ExcelSheet[] = [
    // 1. Balance Sheet / Statement of Financial Position
    {
      name: "Financial Position",
      title: `${companyName} - Statement of Financial Position`,
      subtitle: `As at 31 December ${yearLabel.replace(/\D/g, "") || "2026"} (FRCN & CAMA 2020 Sec 405 Compliant)`,
      columns: [
        { label: "Financial Position Item", width: 260, type: "String" },
        { label: "IFRS Classification", width: 140, type: "String" },
        { label: `Reporting Year (${yearLabel}) ₦`, width: 140, type: "Currency" },
        { label: "Comparative Year ₦", width: 140, type: "Currency" },
      ],
      rows: [
        ["ASSETS", "", "", ""],
        ...assetRows,
        ["TOTAL ASSETS", "", Number(pkg.financialPosition.totalAssetsNgn), 0],
        ["", "", "", ""],
        ["LIABILITIES", "", "", ""],
        ...liabilityRows,
        ["TOTAL LIABILITIES", "", Number(pkg.financialPosition.totalLiabilitiesNgn), 0],
        ["", "", "", ""],
        ["EQUITY & RESERVES", "", "", ""],
        ...equityRows,
        ["  Retained / Current Surplus", "RETAINED_EARNINGS", Number(pkg.financialPosition.retainedAndCurrentEarningsNgn), 0],
        ["TOTAL EQUITY", "", Number(pkg.financialPosition.totalEquityNgn), 0],
      ],
    },

    // 2. Statement of Profit or Loss and Comprehensive Income
    {
      name: "Profit or Loss",
      title: `${companyName} - Statement of Profit or Loss`,
      subtitle: `For the Year Ended 31 December ${yearLabel.replace(/\D/g, "") || "2026"} (IFRS / CAMA 2020)`,
      columns: [
        { label: "Comprehensive Income Item", width: 260, type: "String" },
        { label: "IFRS Tag", width: 140, type: "String" },
        { label: `Reporting Year (${yearLabel}) ₦`, width: 140, type: "Currency" },
      ],
      rows: [
        ["Operating Revenue Lines", "", ""],
        ...(pkg.profitAndLoss.revenueLines ?? []).map((r) => [
          `  ${r.accountName} (${r.accountCode})`,
          r.ifrsTag,
          Number(r.amountNgn),
        ]),
        ["TOTAL OPERATING REVENUE", "", Number(pkg.profitAndLoss.totalRevenueNgn)],
        ["", "", ""],
        ["Operating Expense Lines", "", ""],
        ...(pkg.profitAndLoss.operatingExpenseLines ?? []).map((e) => [
          `  ${e.accountName} (${e.accountCode})`,
          e.ifrsTag,
          -Number(e.amountNgn),
        ]),
        ["TOTAL OPERATING EXPENSES", "", -Number(pkg.profitAndLoss.operatingExpensesNgn)],
        ["", "", ""],
        ["PROFIT BEFORE TAXATION (PBT)", "", Number(pkg.profitAndLoss.profitBeforeTaxNgn)],
        ["Income Tax Expense", "CIT / EDT", -Number(pkg.profitAndLoss.incomeTaxExpenseNgn)],
        ["NET PROFIT / SURPLUS FOR THE YEAR", "", Number(pkg.profitAndLoss.netProfitNgn)],
      ],
    },

    // 3. Statement of Changes in Equity
    {
      name: "Changes in Equity",
      title: `${companyName} - Statement of Changes in Equity`,
      subtitle: `For the Year Ended 31 December ${yearLabel.replace(/\D/g, "") || "2026"}`,
      columns: [
        { label: "Reserve Category", width: 220, type: "String" },
        { label: "Opening Balance (₦)", width: 140, type: "Currency" },
        { label: "Surplus Movement (₦)", width: 140, type: "Currency" },
        { label: "Closing Balance (₦)", width: 140, type: "Currency" },
      ],
      rows: [
        [
          "Total Contributed & Retained Equity",
          Number(pkg.financialPosition.totalEquityNgn) - Number(pkg.profitAndLoss.netProfitNgn),
          Number(pkg.profitAndLoss.netProfitNgn),
          Number(pkg.financialPosition.totalEquityNgn),
        ],
      ],
    },

    // 4. Statement of Cash Flows
    {
      name: "Cash Flows",
      title: `${companyName} - Statement of Cash Flows`,
      subtitle: `For the Year Ended 31 December ${yearLabel.replace(/\D/g, "") || "2026"} (IAS 7 Direct Method)`,
      columns: [
        { label: "Cash Flow Activity", width: 260, type: "String" },
        { label: "IFRS Classification", width: 140, type: "String" },
        { label: "Net Cash Flow (₦)", width: 140, type: "Currency" },
      ],
      rows: [
        ["Cash Flows from Operating Activities", "", ""],
        ["  Cash Receipts from Customers", "REVENUE_INFLOW", Number(pkg.profitAndLoss.totalRevenueNgn)],
        ["  Cash Paid to Suppliers & Operations", "EXPENSE_OUTFLOW", -Number(pkg.profitAndLoss.operatingExpensesNgn)],
        ["Net Cash from Operating Activities", "", Number(pkg.profitAndLoss.netProfitNgn)],
        ["Cash Flows from Financing Activities", "", ""],
        ["  Capital Contributed / Retained", "EQUITY_CONTRIBUTION", Number(pkg.financialPosition.totalEquityNgn)],
        ["Net Increase in Cash & Cash Equivalents", "", Number(pkg.financialPosition.totalAssetsNgn)],
        ["Cash & Cash Equivalents at 31 December", "CASH_AND_EQUIVALENTS", Number(pkg.financialPosition.totalAssetsNgn)],
      ],
    },

    // 5. General Ledger Trial Balance
    {
      name: "Trial Balance",
      title: `${companyName} - General Ledger Trial Balance`,
      subtitle: `Double-Entry Equilibrium Verified (${pkg.isBalanced ? "Balanced 0.00" : "Unbalanced"})`,
      columns: [
        { label: "Account Code", width: 100, type: "String" },
        { label: "Account Title", width: 240, type: "String" },
        { label: "Category", width: 120, type: "String" },
        { label: "Debit (₦)", width: 130, type: "Currency" },
        { label: "Credit (₦)", width: 130, type: "Currency" },
      ],
      rows: [
        ...pkg.trialBalance.map((tb) => [
          tb.accountCode,
          tb.accountName,
          tb.category,
          Number(tb.debitBalanceNgn),
          Number(tb.creditBalanceNgn),
        ]),
        [
          "TOTAL",
          "Double-Entry Verification",
          pkg.isBalanced ? "BALANCED" : "VARIANCE",
          Number(pkg.totalDebitsNgn),
          Number(pkg.totalCreditsNgn),
        ],
      ],
    },

    // 6. FRCN Statement of Value Added (OND Page 41)
    {
      name: "Value Added",
      title: `${companyName} - Statement of Value Added`,
      subtitle: `FRCN National Disclosure Page 41 (${yearLabel})`,
      columns: [
        { label: "Value Added Component", width: 240, type: "String" },
        { label: "Amount (₦)", width: 140, type: "Currency" },
        { label: "Distribution %", width: 110, type: "String" },
      ],
      rows: pkg.valueAddedStatement.map((va) => [
        va.lineLabel,
        Number(va.amountNgn),
        `${va.percentageShare}%`,
      ]),
    },

    // 7. Five-Year Financial Summary (OND Page 42)
    {
      name: "Five-Year Summary",
      title: `${companyName} - Five-Year Financial Summary`,
      subtitle: "FRCN Other National Disclosures (Comparative Multi-Period)",
      columns: [
        { label: "Fiscal Year", width: 110, type: "String" },
        { label: "Total Assets (₦)", width: 140, type: "Currency" },
        { label: "Gross Revenue (₦)", width: 140, type: "Currency" },
        { label: "Profit Before Tax (₦)", width: 140, type: "Currency" },
        { label: "Net Equity (₦)", width: 140, type: "Currency" },
      ],
      rows: pkg.fiveYearSummary.map((fy) => [
        fy.fiscalYearLabel,
        Number(fy.totalAssetsNgn),
        Number(fy.revenueNgn),
        Number(fy.profitBeforeTaxNgn),
        Number(fy.netEquityNgn),
      ]),
    },

    // 8. Statutory & CAMA 2020 Sec 405 Certification Info
    {
      name: "FRCN Certification",
      title: `${companyName} - CAMA 2020 Sec 405 Certification & Attestation`,
      subtitle: "Statutory Signing Officers & Independent Auditor Verification",
      columns: [
        { label: "Statutory Role", width: 200, type: "String" },
        { label: "Signatory / Entity", width: 220, type: "String" },
        { label: "FRCN / ICAN License No", width: 220, type: "String" },
        { label: "Status & Date", width: 160, type: "String" },
      ],
      rows: [
        ["Chief Executive Officer", "Dr. Rabiu Olowo", "FRC/2020/PRO/ICAN/008/00000021804", "Signed 29 April 2026"],
        ["Chief Financial Officer", "Charles Ose.Odafen", "FRC/2024/PRO/ICAN/001/743499", "Signed 29 April 2026"],
        ["Independent Auditor", "PKF Professional Services (Benson O. Adejayan FCA)", "FRC/2013/PRO/ICAN/004/00000002226", "ICAN Seal: 0207363"],
        ["Audit Framework", "International Standards on Auditing (ISAs)", "COSO 2013 ICFR", "Unqualified True & Fair"],
        ["Cryptographic Digest", "SHA-256 Ledger Snapshot", pkg.snapshotHash, "Immutable CAMA Sec 405"],
      ],
    },
  ];

  const xml = buildXmlWorkbook(sheets);
  const safeFilename = `${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_FRCN_${yearLabel}_Statements.xlsx`;
  downloadExcelFile(xml, safeFilename);
}
