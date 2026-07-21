import { modules } from "@/lib/modules";
import { draftFromPayload } from "@/lib/payload-mapping";
import type {
  DepartmentEntryRecord,
  DraftRow,
  FieldDefinition,
  ModuleDefinition,
  ReportingPeriodRecord,
  SectionDefinition
} from "@/lib/types";

type SectionSnapshot = {
  section: SectionDefinition;
  rows: DraftRow[];
  visibleFields: FieldDefinition[];
};

type ModuleSnapshot = {
  module: ModuleDefinition;
  entry?: DepartmentEntryRecord;
  sections: SectionSnapshot[];
  hasContent: boolean;
};

const COLORS = {
  ink: "#1E1E1E",
  muted: "#6B7280",
  accent: "#7A1F2B",
  accentDark: "#5B1520",
  accentSoft: "#F3F4F6",
  line: "#D1D5DB",
  panel: "#F7F7F8",
  panelAlt: "#EFEFF1",
  white: "#FFFFFF",
  variancePositiveFill: "#E3F1E5",
  variancePositiveText: "#1F5B2B",
  varianceNegativeFill: "#F8E3E7",
  varianceNegativeText: "#8A2535",
  varianceNeutralFill: "#F3F4F6"
};

export function getModuleById(moduleId: string) {
  return modules.find((module) => module.id === moduleId) ?? null;
}

export function buildModulePrintHtml(
  period: ReportingPeriodRecord,
  entries: DepartmentEntryRecord[],
  moduleId: string,
  autoprint = false
) {
  const module = getModuleById(moduleId);
  if (!module) {
    throw new Error("Module not found.");
  }

  const snapshot = buildModuleSnapshot(module, entries);
  const summaryCards = snapshot.sections
    .flatMap((sectionSnapshot) => summarizeSection(sectionSnapshot.section, sectionSnapshot.rows))
    .slice(0, 8);

  const autoPrintScript = autoprint
    ? `<script>
        window.addEventListener("load", () => {
          window.setTimeout(() => window.print(), 250);
        });
        window.addEventListener("afterprint", () => window.close());
      </script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(`weekly-report-${period.label}-${module.shortName}`)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font-family: Aptos, "Segoe UI", Arial, sans-serif;
        color: ${COLORS.ink};
        background: ${COLORS.white};
      }
      .page {
        padding: 28px 32px 40px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 2.2fr) minmax(220px, 1fr);
        border: 1px solid ${COLORS.line};
      }
      .hero-main {
        background: ${COLORS.accentDark};
        color: ${COLORS.white};
        padding: 24px 28px;
      }
      .hero-side {
        background: ${COLORS.accentSoft};
        padding: 24px;
      }
      .eyebrow {
        margin: 0 0 8px;
        color: ${COLORS.accent};
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .hero-main .eyebrow {
        color: #FDE5E8;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 28px;
        line-height: 1.1;
      }
      .hero-main p,
      .module-summary,
      .status-note,
      .empty {
        margin: 0;
        font-size: 14px;
        line-height: 1.55;
      }
      .meta-label {
        margin: 0 0 6px;
        color: ${COLORS.muted};
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .meta-value {
        margin: 0 0 18px;
        font-size: 18px;
        font-weight: 700;
      }
      .module-header {
        margin: 22px 0 8px;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .module-summary {
        color: ${COLORS.muted};
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 8px 14px;
        border: 1px solid ${COLORS.line};
        background: ${statusFill(snapshot.entry?.status ?? "missing")};
        font-size: 13px;
        font-weight: 700;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin: 18px 0 22px;
      }
      .summary-card {
        border: 1px solid ${COLORS.line};
        background: ${COLORS.panelAlt};
        padding: 12px 14px;
      }
      .summary-card .label {
        margin: 0 0 6px;
        color: ${COLORS.muted};
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .summary-card .value {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
      }
      .section {
        margin-top: 18px;
      }
      .section > h2 {
        margin: 0 0 4px;
        color: ${COLORS.accent};
        font-size: 18px;
        line-height: 1.2;
        text-transform: uppercase;
      }
      .section-meta {
        margin: 0 0 10px;
        color: ${COLORS.muted};
        font-size: 13px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .table-wrap {
        border: 1px solid ${COLORS.line};
        overflow: hidden;
      }
      th,
      td {
        border: 1px solid ${COLORS.line};
        padding: 9px 12px;
        vertical-align: top;
        font-size: 13px;
        line-height: 1.45;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      th {
        background: ${COLORS.panelAlt};
        text-align: left;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      td.numeric {
        text-align: right;
      }
      td.variance-positive {
        background: ${COLORS.variancePositiveFill};
        color: ${COLORS.variancePositiveText};
      }
      td.variance-negative {
        background: ${COLORS.varianceNegativeFill};
        color: ${COLORS.varianceNegativeText};
      }
      td.variance-neutral {
        background: ${COLORS.varianceNeutralFill};
      }
      .section-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-top: 10px;
      }
      .section-summary .item {
        border: 1px solid ${COLORS.line};
        background: ${COLORS.panel};
        padding: 10px 12px;
      }
      .section-summary .item .label {
        margin: 0 0 6px;
        color: ${COLORS.muted};
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      .section-summary .item .value {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
      }
      .empty {
        border: 1px solid ${COLORS.line};
        background: ${COLORS.panel};
        color: ${COLORS.muted};
        padding: 14px 16px;
      }
      @media print {
        @page {
          size: A4;
          margin: 12mm;
        }
        .page {
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-main">
          <p class="eyebrow">Patos-Marinza</p>
          <h1>${escapeHtml(module.name)}</h1>
          <p>${escapeHtml(module.summary)}</p>
        </div>
        <div class="hero-side">
          <p class="meta-label">Reporting period</p>
          <p class="meta-value">${escapeHtml(period.label)}</p>
          <p class="meta-label">Status</p>
          <p class="meta-value">${escapeHtml(humanizeStatus(snapshot.entry?.status ?? "missing"))}</p>
        </div>
      </section>

      <div class="module-header">
        <div>
          <p class="eyebrow">${escapeHtml(module.reportSection)}</p>
          <p class="module-summary">${escapeHtml(module.summary)}</p>
        </div>
        <span class="status-badge">${escapeHtml(humanizeStatus(snapshot.entry?.status ?? "missing"))}</span>
      </div>

      ${summaryCards.length ? `
      <section class="summary-grid">
        ${summaryCards.map((item) => `
          <article class="summary-card">
            <p class="label">${escapeHtml(item.label)}</p>
            <p class="value">${escapeHtml(item.value)}</p>
          </article>
        `).join("")}
      </section>` : ""}

      ${snapshot.hasContent ? snapshot.sections.map(renderSection).join("") : `
      <section class="section">
        <p class="empty">No update has been submitted for this department for the selected reporting week.</p>
      </section>`}
    </main>
    ${autoPrintScript}
  </body>
</html>`;
}

function buildModuleSnapshot(module: ModuleDefinition, entries: DepartmentEntryRecord[]): ModuleSnapshot {
  const entry = resolveModuleEntry(module, entries);
  const draft = draftFromPayload(module, entry?.payload).draft;

  const sections = module.sections
    .map((section) => {
      const rows = normalizeSectionRows(section, draft[section.id] ?? []);
      return {
        section,
        rows,
        visibleFields: getVisibleFields(section, rows)
      };
    })
    .filter((section) => section.rows.length > 0);

  return {
    module,
    entry,
    sections,
    hasContent: sections.length > 0
  };
}

function resolveModuleEntry(module: ModuleDefinition, entries: DepartmentEntryRecord[]) {
  const directEntry = entries.find((item) => item.department_id === module.id);
  if (directEntry || module.id !== "eor") {
    return directEntry;
  }

  return entries.find((item) => item.department_id === "reservoir");
}

function renderSection(snapshot: SectionSnapshot) {
  const summary = summarizeSection(snapshot.section, snapshot.rows);

  return `
    <section class="section">
      <h2>${escapeHtml(snapshot.section.name)}</h2>
      <p class="section-meta">${snapshot.rows.length} row${snapshot.rows.length === 1 ? "" : "s"} entered</p>
      ${renderTable(snapshot.section, snapshot.rows, snapshot.visibleFields)}
      ${summary.length ? `
        <div class="section-summary">
          ${summary.map((item) => `
            <article class="item">
              <p class="label">${escapeHtml(item.label)}</p>
              <p class="value">${escapeHtml(item.value)}</p>
            </article>
          `).join("")}
        </div>` : ""}
    </section>
  `;
}

function renderTable(section: SectionDefinition, rows: DraftRow[], visibleFields: FieldDefinition[]) {
  const includeRowNumber = usesImplicitRowNumber(section);
  const dataFields = includeRowNumber ? visibleFields.filter((field) => field.id !== "id") : visibleFields;
  const widths = dataFields.map((field) => getColumnWidth(section, field, dataFields.length));

  return `
    <div class="table-wrap">
      <table>
        <colgroup>
          ${includeRowNumber ? '<col style="width: 7%;">' : ""}
          ${widths.map((width) => `<col style="width: ${width};">`).join("")}
        </colgroup>
        <thead>
          <tr>
            ${includeRowNumber ? "<th>#</th>" : ""}
            ${dataFields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => `
            <tr>
              ${includeRowNumber ? `<td class="numeric">${escapeHtml(row.id || `${index + 1}`)}</td>` : ""}
              ${dataFields.map((field) => renderCell(field, row[field.id] ?? "")).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCell(field: FieldDefinition, rawValue: string) {
  const formattedValue = formatFieldValue(field, rawValue);
  const classes = [
    field.type === "number" ? "numeric" : "",
    field.calculated ? varianceClass(rawValue) : ""
  ].filter(Boolean).join(" ");

  return `<td class="${classes}">${escapeHtml(formattedValue || "-")}</td>`;
}

function summarizeSection(section: SectionDefinition, rows: DraftRow[]) {
  const effectiveRows = rows.filter((row) => !isExplicitTotalRow(section, row));
  const items: Array<{ label: string; value: string }> = [];

  (section.totals ?? []).forEach((fieldId) => {
    const field = section.fields.find((item) => item.id === fieldId);
    if (!field) {
      return;
    }
    items.push({
      label: `Total ${field.label}`,
      value: formatNumber(statTotal(effectiveRows, fieldId))
    });
  });

  (section.averages ?? []).forEach((fieldId) => {
    const field = section.fields.find((item) => item.id === fieldId);
    if (!field) {
      return;
    }
    const suffix = field.label.includes("%") ? "%" : "";
    items.push({
      label: `Average ${field.label}`,
      value: `${formatNumber(statAverage(effectiveRows, fieldId))}${suffix}`
    });
  });

  return items;
}

function normalizeSectionRows(section: SectionDefinition, rows: DraftRow[]) {
  const normalizedRows = rows
    .map((row) => {
      const cleanRow: DraftRow = {};
      section.fields.forEach((field) => {
        cleanRow[field.id] = normalizeText(row[field.id]);
      });
      return applyCalculatedFields(section, cleanRow);
    })
    .filter((row) => section.fields.some((field) => hasMeaningfulValue(row[field.id])));

  if (!usesImplicitRowNumber(section)) {
    return normalizedRows;
  }

  return normalizedRows.map((row, index) => ({
    ...row,
    id: `${index + 1}`
  }));
}

function getVisibleFields(section: SectionDefinition, rows: DraftRow[]) {
  if (usesImplicitRowNumber(section)) {
    return section.fields.filter((field) => field.id !== "id");
  }

  const visible = section.fields.filter((field) => rows.some((row) => hasMeaningfulValue(row[field.id])));
  return visible.length ? visible : section.fields;
}

function usesImplicitRowNumber(section: SectionDefinition) {
  return (
    section.fields.length === 2 &&
    section.fields[0]?.id === "id" &&
    (section.fields[1]?.id === "description" || section.fields[1]?.id === "comment")
  );
}

function applyCalculatedFields(section: SectionDefinition, row: DraftRow) {
  const nextRow = { ...row };

  section.fields.forEach((field) => {
    if (!field.calculated) {
      return;
    }

    nextRow[field.id] = evaluateCalculatedField(field.calculated, nextRow);
  });

  return nextRow;
}

function evaluateCalculatedField(expression: string, row: DraftRow) {
  const match = expression.match(/^([a-zA-Z0-9_]+)-([a-zA-Z0-9_]+)$/);
  if (!match) {
    return "";
  }

  const [, leftKey, rightKey] = match;
  const leftRaw = `${row[leftKey] ?? ""}`.trim();
  const rightRaw = `${row[rightKey] ?? ""}`.trim();
  if (!leftRaw && !rightRaw) {
    return "";
  }

  const left = Number.parseFloat(leftRaw || "0");
  const right = Number.parseFloat(rightRaw || "0");
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return "";
  }

  return formatCalculatedNumber(left - right);
}

function formatCalculatedNumber(value: number) {
  if (Number.isInteger(value)) {
    return `${value}`;
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function varianceClass(rawValue: string) {
  const numeric = parseNumber(rawValue);
  if (numeric === null || numeric === 0) {
    return "variance-neutral";
  }

  return numeric > 0 ? "variance-positive" : "variance-negative";
}

function isExplicitTotalRow(section: SectionDefinition, row: DraftRow) {
  const firstLabelField = section.fields.find((field) => field.type !== "number");
  if (!firstLabelField) {
    return false;
  }

  return normalizeText(row[firstLabelField.id]).toLowerCase() === "total";
}

function statTotal(rows: DraftRow[], fieldId: string) {
  return rows.reduce((total, row) => total + (parseNumber(row[fieldId]) ?? 0), 0);
}

function statAverage(rows: DraftRow[], fieldId: string) {
  const numbers = rows
    .map((row) => parseNumber(row[fieldId]))
    .filter((value): value is number => value !== null);

  if (!numbers.length) {
    return 0;
  }

  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

function formatFieldValue(field: FieldDefinition, value: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }

  if (field.type === "date") {
    return formatDate(normalized);
  }

  if (field.type === "number") {
    const numeric = parseNumber(normalized);
    return numeric === null ? normalized : formatNumber(numeric);
  }

  return normalized;
}

function formatDate(value: string) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!isoMatch) {
    return value;
  }

  const [, year, month, day] = isoMatch;
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1];
  return `${day} ${monthName} ${year}`;
}

function getColumnWidth(section: SectionDefinition, field: FieldDefinition, fieldCount: number) {
  if (section.id === "projects") {
    if (field.id === "project" || field.id === "subproject") {
      return "20%";
    }
    if (field.id === "activity") {
      return "60%";
    }
  }

  if (field.id === "incidentCode") {
    return "18%";
  }

  if (field.id === "date") {
    return "14%";
  }

  if (field.id === "well") {
    return "12%";
  }

  if (field.id === "lease") {
    return "10%";
  }

  if (field.id === "type") {
    return section.id === "other" ? "18%" : "14%";
  }

  if (field.id === "facility") {
    return "18%";
  }

  if (field.id === "comment" || field.id === "description" || field.id === "activity" || field.id === "operations") {
    return fieldCount > 1 ? `${Math.max(30, 100 - ((fieldCount - 1) * 12))}%` : "100%";
  }

  if (field.id === "stream" || field.id === "substream") {
    return "24%";
  }

  if (section.id === "currentWeek" || section.id === "lastWeek") {
    return `${Math.max(100 / fieldCount, 12)}%`;
  }

  return `${Math.max(100 / fieldCount, 12)}%`;
}

function parseNumber(value: string) {
  const normalized = normalizeText(value).replace(/,/g, "");
  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

function normalizeText(value: unknown) {
  return `${value ?? ""}`.replace(/\s+/g, " ").trim();
}

function hasMeaningfulValue(value: unknown) {
  return normalizeText(value).length > 0;
}

function humanizeStatus(status: string) {
  if (status === "submitted") return "Submitted";
  if (status === "approved") return "Approved";
  if (status === "draft") return "Draft";
  if (status === "reopened") return "Reopened";
  return "No update";
}

function statusFill(status: string) {
  if (status === "submitted" || status === "approved") {
    return "#E3F1E5";
  }
  if (status === "draft" || status === "reopened") {
    return "#F3F4F6";
  }
  return COLORS.panel;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
