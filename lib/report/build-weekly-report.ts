import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";
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

const FONT = "Aptos";
const CONTENT_WIDTH = 10000;
const SVG_FALLBACK_PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnRkN4AAAAASUVORK5CYII=", "base64");
const COLORS = {
  ink: "1E1E1E",
  muted: "6B7280",
  accent: "7A1F2B",
  accentSoft: "E5E7EB",
  accentText: "7A1F2B",
  panel: "F7F7F8",
  panelAlt: "EFEFF1",
  panelStrong: "D1D5DB",
  line: "D1D5DB",
  white: "FFFFFF",
  darkPanel: "5B1520",
  darkMuted: "E5E7EB",
  statusGood: "E5E7EB",
  statusGoodText: "7A1F2B",
  statusDraft: "F3F4F6",
  statusDraftText: "7A1F2B",
  statusPending: "F3F4F6",
  statusPendingText: "6B7280",
  variancePositiveFill: "E3F1E5",
  variancePositiveText: "1F5B2B",
  varianceNegativeFill: "F8E3E7",
  varianceNegativeText: "8A2535",
  varianceNeutralFill: "F3F4F6"
};

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

export async function buildWeeklyReport(period: ReportingPeriodRecord, entries: DepartmentEntryRecord[]) {
  const snapshots = modules.map((module) => buildModuleSnapshot(module, entries));

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: FONT, size: 20, color: COLORS.ink },
          paragraph: { spacing: { after: 90, line: 300 } }
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 760, bottom: 760, left: 760 }
        }
      },
      children: [
        heroBanner(period),
        spacer(180),
        coverContents(period, snapshots),
        pageBreak(),
        ...snapshots.flatMap((snapshot, index) => renderModule(snapshot, index))
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

function buildModuleSnapshot(module: ModuleDefinition, entries: DepartmentEntryRecord[]): ModuleSnapshot {
  const entry = entries.find((item) => item.department_id === module.id);
  const draft = draftFromPayload(module, entry?.payload).draft;

  const sections = module.sections
    .map((section) => {
      const rows = sanitizeRows(section, draft[section.id] ?? []);
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

function renderModule(snapshot: ModuleSnapshot, index: number) {
  if (snapshot.module.id === "production") {
    return renderProductionModule(snapshot, index);
  }

  const blocks = [moduleHeader(snapshot)];

  if (snapshot.hasContent) {
    blocks.push(bodyText(snapshot.module.summary, COLORS.muted));
    snapshot.sections.forEach((sectionSnapshot) => {
      blocks.push(sectionHeading(sectionSnapshot.section.name));

      const highlights = metricHighlights(sectionSnapshot.section, sectionSnapshot.rows);
      if (highlights.length && !showHighlightsAfterTable(sectionSnapshot.section)) {
        blocks.push(highlightGrid(highlights));
      }

      if (shouldRenderAsCards(sectionSnapshot.section, sectionSnapshot.visibleFields, sectionSnapshot.rows)) {
        blocks.push(...renderRowCards(sectionSnapshot.section, sectionSnapshot.rows, sectionSnapshot.visibleFields));
      } else {
        blocks.push(dataTable(sectionSnapshot.section, sectionSnapshot.rows, sectionSnapshot.visibleFields));
        if (shouldRenderTotalsBelowTable(sectionSnapshot.section)) {
          blocks.push(spacer(20));
          blocks.push(sectionTotalsTable(sectionSnapshot.section, sectionSnapshot.rows, sectionSnapshot.visibleFields));
        }
      }

      if (highlights.length && showHighlightsAfterTable(sectionSnapshot.section)) {
        blocks.push(spacer(30));
        blocks.push(highlightGrid(highlights));
      }

      blocks.push(spacer(40));
    });
  } else {
    blocks.push(bodyText(snapshot.module.summary, COLORS.muted));
    blocks.push(infoCallout("No update has been submitted for this department for the selected reporting week."));
  }

  if (index < modules.length - 1) {
    blocks.push(pageBreak());
  }

  return blocks;
}

function renderProductionModule(snapshot: ModuleSnapshot, index: number) {
  const blocks = [moduleHeader(snapshot)];

  if (snapshot.hasContent) {
    blocks.push(bodyText(snapshot.module.summary, COLORS.muted));

    const currentWeek = snapshot.sections.find((section) => section.section.id === "currentWeek");
    const lastWeek = snapshot.sections.find((section) => section.section.id === "lastWeek");

    if (currentWeek) {
      blocks.push(sectionHeading(currentWeek.section.name));
      blocks.push(dataTable(currentWeek.section, currentWeek.rows, currentWeek.visibleFields));
      blocks.push(spacer(40));
    }

    if (lastWeek) {
      blocks.push(sectionHeading(lastWeek.section.name));
      blocks.push(dataTable(lastWeek.section, lastWeek.rows, lastWeek.visibleFields));
      blocks.push(spacer(60));
    }

    if (currentWeek || lastWeek) {
      blocks.push(sectionHeading("Summary Totals"));
      blocks.push(productionSummaryTable(currentWeek?.rows ?? [], lastWeek?.rows ?? []));
      blocks.push(spacer(60));
      blocks.push(sectionHeading("Trend Comparison"));
      blocks.push(...productionTrendCharts(currentWeek?.rows ?? [], lastWeek?.rows ?? []));
    }
  } else {
    blocks.push(bodyText(snapshot.module.summary, COLORS.muted));
    blocks.push(infoCallout("No update has been submitted for this department for the selected reporting week."));
  }

  if (index < modules.length - 1) {
    blocks.push(pageBreak());
  }

  return blocks;
}

function heroBanner(period: ReportingPeriodRecord) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6800, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: COLORS.darkPanel },
            borders: noBorders(),
            margins: { top: 220, bottom: 220, left: 240, right: 240 },
            children: [
              eyebrow("PATOS-MARINZA", COLORS.white),
              title("Weekly Management Report", COLORS.white),
              bodyText("Operational updates consolidated into a cleaner weekly briefing.", COLORS.darkMuted)
            ]
          }),
          new TableCell({
            width: { size: 3200, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: COLORS.accentSoft },
            borders: noBorders(),
            margins: { top: 220, bottom: 220, left: 220, right: 220 },
            children: [
              statLabel("REPORTING PERIOD"),
              statValue(period.label, COLORS.accentText),
              spacer(40),
              statLabel("STATUS"),
              statValue(humanizeStatus(period.status), COLORS.ink)
            ]
          })
        ]
      })
    ]
  });
}

function coverContents(period: ReportingPeriodRecord, snapshots: ModuleSnapshot[]) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLORS.white },
            borders: thinBorders(),
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: "CONTENTS",
                    font: FONT,
                    size: 20,
                    bold: true,
                    color: COLORS.accentText
                  })
                ]
              }),
              spacer(60),
              ...snapshots.map((snapshot, index) => coverContentRow(snapshot, index))
            ]
          })
        ]
      })
    ]
  });
}

function coverContentRow(snapshot: ModuleSnapshot, index: number) {
  return new Paragraph({
    spacing: { after: 55 },
    tabStops: [{ type: "right", position: 9200 }],
    children: [
      new TextRun({
        text: `${index + 1}. ${snapshot.module.reportSection}`,
        font: FONT,
        size: 20,
        bold: true,
        color: COLORS.ink
      }),
      new TextRun({
        text: "\t"
      }),
      new TextRun({
        text: snapshot.hasContent ? "Included" : "No update",
        font: FONT,
        size: 17,
        color: snapshot.hasContent ? COLORS.accentText : COLORS.muted
      })
    ]
  });
}

function moduleHeader(snapshot: ModuleSnapshot) {
  const status = snapshot.entry?.status ?? "missing";
  const [statusFill, statusText] = statusColors(status);

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 7800, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: COLORS.white },
            margins: { top: 130, bottom: 130, left: 170, right: 170 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
              left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.accent },
              right: { style: BorderStyle.NONE, size: 0, color: COLORS.white }
            },
            children: [
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: snapshot.module.reportSection,
                    font: FONT,
                    size: 24,
                    bold: true,
                    color: COLORS.ink
                  })
                ]
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: snapshot.module.name,
                    font: FONT,
                    size: 18,
                    color: COLORS.muted
                  })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 2200, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: statusFill },
            margins: { top: 140, bottom: 140, left: 170, right: 170 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
              left: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
              right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: statusText,
                    font: FONT,
                    size: 18,
                    bold: true,
                    color: COLORS.ink
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function sectionHeading(text: string) {
  return new Paragraph({
    spacing: { before: 140, after: 30 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        font: FONT,
        size: 16,
        bold: true,
        color: COLORS.accentText
      })
    ]
  });
}

function renderRowCards(section: SectionDefinition, rows: DraftRow[], visibleFields: FieldDefinition[]) {
  return rows.map((row, index) => rowCard(section, row, visibleFields, index));
}

function rowCard(section: SectionDefinition, row: DraftRow, visibleFields: FieldDefinition[], index: number) {
  const primaryField = visibleFields.find((field) => field.type !== "memo" && hasMeaningfulValue(row[field.id])) ?? visibleFields[0];
  const secondaryBits = visibleFields
    .filter((field) => field.id !== primaryField?.id && field.type !== "memo")
    .map((field) => ({ label: field.label, value: formatFieldValue(field, row[field.id]) }))
    .filter((item) => hasMeaningfulValue(item.value))
    .slice(0, 3);

  const memoFields = visibleFields
    .filter((field) => field.type === "memo")
    .map((field) => ({ label: field.label, value: formatFieldValue(field, row[field.id]) }))
    .filter((item) => hasMeaningfulValue(item.value));

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: index % 2 === 0 ? COLORS.white : COLORS.panel },
            borders: thinBorders(),
            margins: { top: 130, bottom: 130, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { after: 30 },
                children: [
                  new TextRun({
                    text: primaryField && hasMeaningfulValue(row[primaryField.id])
                      ? formatFieldValue(primaryField, row[primaryField.id])
                      : `${section.name} ${index + 1}`,
                    font: FONT,
                    size: 22,
                    bold: true,
                    color: COLORS.ink
                  })
                ]
              }),
              ...(secondaryBits.length
                ? [new Paragraph({
                    spacing: { after: memoFields.length ? 60 : 0 },
                    children: [
                      new TextRun({
                        text: secondaryBits.map((item) => `${item.label}: ${item.value}`).join("  |  "),
                        font: FONT,
                        size: 18,
                        color: COLORS.muted
                      })
                    ]
                  })]
                : []),
              ...memoFields.flatMap((item) => ([
                new Paragraph({
                  spacing: { after: 10 },
                  children: [
                    new TextRun({
                      text: item.label,
                      font: FONT,
                      size: 17,
                      bold: true,
                      color: COLORS.accentText
                    })
                  ]
                }),
                new Paragraph({
                  spacing: { after: 50 },
                  children: [
                    new TextRun({
                      text: item.value,
                      font: FONT,
                      size: 19,
                      color: COLORS.ink
                    })
                  ]
                })
              ]))
            ]
          })
        ]
      })
    ]
  });
}

function dataTable(section: SectionDefinition, rows: DraftRow[], visibleFields: FieldDefinition[]) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        tableHeader: true,
        children: visibleFields.map((field) => headerCell(field, section))
      }),
      ...rows.map((row, rowIndex) => new TableRow({
        children: visibleFields.map((field) => dataCell(
          field,
          section,
          formatFieldValue(field, row[field.id]),
          ...cellPresentation(field, row[field.id], rowIndex % 2 === 0 ? COLORS.white : COLORS.panel),
          field.type === "number" ? AlignmentType.RIGHT : AlignmentType.LEFT
        ))
      }))
    ]
  });
}

function shouldRenderTotalsBelowTable(section: SectionDefinition) {
  return section.id === "productionBudget" || section.id === "eorCycle";
}

function sectionTotalsTable(section: SectionDefinition, rows: DraftRow[], visibleFields: FieldDefinition[]) {
  const summarizedRows = rows.filter((row) => !isExplicitTotalRow(section, row));

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: visibleFields.map((field, index) => {
          if (field.type === "number") {
            const total = summarizedRows.reduce((sum, row) => sum + (parseNumber(row[field.id]) ?? 0), 0);
            return dataCell(
              field,
              section,
              formatNumber(total),
              ...cellPresentation(field, String(total), COLORS.panelAlt),
              AlignmentType.RIGHT,
              true
            );
          }

          return dataCell(
            field,
            section,
            index === 0 ? "Total" : "",
            COLORS.panelAlt,
            COLORS.ink,
            AlignmentType.LEFT,
            true
          );
        })
      })
    ]
  });
}

function metricHighlights(section: SectionDefinition, rows: DraftRow[]) {
  if (section.id === "downWellImpact") {
    const beforeTotal = rows.reduce((sum, row) => sum + (parseNumber(row.beforeWoProduction) ?? 0), 0);
    const afterTotal = rows.reduce((sum, row) => sum + (parseNumber(row.afterWoProduction) ?? 0), 0);
    const items = [
      { label: "Before WO production total", value: formatNumber(beforeTotal) },
      { label: "After WO production total", value: formatNumber(afterTotal) },
      { label: "After WO - Before WO", value: formatSigned(afterTotal - beforeTotal, "") }
    ];

    return items;
  }

  const highlights: Array<{ label: string; value: string }> = [];

  (section.totals ?? []).forEach((fieldId) => {
    const field = section.fields.find((item) => item.id === fieldId);
    if (!field) {
      return;
    }
    const values = rows.map((row) => parseNumber(row[fieldId])).filter((value): value is number => value !== null);
    if (!values.length) {
      return;
    }
    highlights.push({ label: `${field.label} total`, value: formatNumber(values.reduce((sum, value) => sum + value, 0)) });
  });

  (section.averages ?? []).forEach((fieldId) => {
    const field = section.fields.find((item) => item.id === fieldId);
    if (!field) {
      return;
    }
    const values = rows.map((row) => parseNumber(row[fieldId])).filter((value): value is number => value !== null);
    if (!values.length) {
      return;
    }
    highlights.push({ label: `${field.label} avg`, value: formatNumber(values.reduce((sum, value) => sum + value, 0) / values.length) });
  });

  return highlights.slice(0, 4);
}

function showHighlightsAfterTable(section: SectionDefinition) {
  return section.id === "downWellImpact" || section.id === "thermalProduction" || section.id === "steamInjection";
}

function highlightGrid(items: Array<{ label: string; value: string }>) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: items.map((item) => new TableCell({
          width: { size: Math.floor(CONTENT_WIDTH / items.length), type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: COLORS.panelAlt },
          borders: thinBorders(),
          margins: { top: 100, bottom: 100, left: 140, right: 140 },
          children: [
            new Paragraph({
              spacing: { after: 20 },
              children: [
                new TextRun({
                  text: item.label.toUpperCase(),
                  font: FONT,
                  size: 15,
                  bold: true,
                  color: COLORS.muted
                })
              ]
            }),
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: item.value,
                  font: FONT,
                  size: 22,
                  bold: true,
                  color: COLORS.ink
                })
              ]
            })
          ]
        }))
      })
    ]
  });
}

function headerCell(field: FieldDefinition, section?: SectionDefinition) {
  return new TableCell({
    width: fieldWidth(field, section),
    shading: { type: ShadingType.CLEAR, fill: COLORS.panelStrong },
    borders: thinBorders(),
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: field.label,
            font: FONT,
            size: 17,
            bold: true,
            color: COLORS.ink
          })
        ]
      })
    ]
  });
}

function dataCell(
  field: FieldDefinition,
  section: SectionDefinition | undefined,
  text: string,
  fill: string,
  textColor: string,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
  bold = false
) {
  return new TableCell({
    width: fieldWidth(field, section),
    shading: { type: ShadingType.CLEAR, fill },
    borders: thinBorders(),
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment,
        spacing: { after: 0 },
        children: [
          new TextRun({
            text: text || "-",
            font: FONT,
            size: 18,
            color: textColor,
            bold
          })
        ]
      })
    ]
  });
}

function cellPresentation(field: FieldDefinition, rawValue: string, baseFill: string): [string, string] {
  if (!field.calculated) {
    return [baseFill, COLORS.ink];
  }

  const numeric = parseNumber(rawValue);
  if (numeric === null || numeric === 0) {
    return [COLORS.varianceNeutralFill, COLORS.ink];
  }

  if (numeric > 0) {
    return [COLORS.variancePositiveFill, COLORS.variancePositiveText];
  }

  return [COLORS.varianceNegativeFill, COLORS.varianceNegativeText];
}

function isExplicitTotalRow(section: SectionDefinition, row: DraftRow) {
  const firstLabelField = section.fields.find((field) => field.type !== "number");
  if (!firstLabelField) {
    return false;
  }

  return normalizeText(row[firstLabelField.id]).toLowerCase() === "total";
}

function bodyText(text: string, color = COLORS.ink) {
  return new Paragraph({
    spacing: { after: 90 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 19,
        color
      })
    ]
  });
}

function infoCallout(text: string) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLORS.panel },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
              left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.panelStrong },
              right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line }
            },
            margins: { top: 130, bottom: 130, left: 170, right: 170 },
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text,
                    font: FONT,
                    size: 18,
                    color: COLORS.muted
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function pageBreak() {
  return new Paragraph({
    pageBreakBefore: true
  });
}

function eyebrow(text: string, color: string) {
  return new Paragraph({
    spacing: { after: 30 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 16,
        bold: true,
        color
      })
    ]
  });
}

function title(text: string, color: string) {
  return new Paragraph({
    spacing: { after: 50 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 36,
        bold: true,
        color
      })
    ]
  });
}

function statLabel(text: string) {
  return new Paragraph({
    spacing: { after: 20 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 15,
        bold: true,
        color: COLORS.muted
      })
    ]
  });
}

function statValue(text: string, color: string) {
  return new Paragraph({
    spacing: { after: 0 },
    children: [
      new TextRun({
        text,
        font: FONT,
        size: 22,
        bold: true,
        color
      })
    ]
  });
}

function spacer(after = 80) {
  return new Paragraph({
    spacing: { after },
    children: [new TextRun({ text: "", font: FONT, size: 2 })]
  });
}

function sanitizeRows(section: SectionDefinition, rows: DraftRow[]) {
  return rows
    .map((row) => {
      const cleanRow: DraftRow = {};
      section.fields.forEach((field) => {
        cleanRow[field.id] = normalizeText(row[field.id]);
      });
      return cleanRow;
    })
    .filter((row) => section.fields.some((field) => hasMeaningfulValue(row[field.id])));
}

function getVisibleFields(section: SectionDefinition, rows: DraftRow[]) {
  return section.fields.filter((field) => rows.some((row) => hasMeaningfulValue(row[field.id])));
}

function shouldRenderAsCards(section: SectionDefinition, visibleFields: FieldDefinition[], rows: DraftRow[]) {
  if (section.kind === "metrics") {
    return false;
  }

  if (section.id === "serviceTypes") {
    return false;
  }

  const fieldIds = visibleFields.map((field) => field.id);
  const isTypeFacilityDescriptionTable =
    fieldIds.includes("type") &&
    fieldIds.includes("facility") &&
    fieldIds.includes("description");

  if (isTypeFacilityDescriptionTable) {
    return false;
  }

  const isProjectTable =
    fieldIds.includes("project") &&
    fieldIds.includes("activity");

  if (isProjectTable) {
    return false;
  }

  const isIncidentTable =
    fieldIds.includes("incidentCode") &&
    fieldIds.includes("date") &&
    fieldIds.includes("description");

  if (isIncidentTable) {
    return false;
  }

  const isSimpleIdDescription =
    visibleFields.length === 2 &&
    fieldIds.includes("id") &&
    (fieldIds.includes("description") || fieldIds.includes("comment"));

  if (isSimpleIdDescription) {
    return false;
  }

  const memoFields = visibleFields.filter((field) => field.type === "memo").length;
  return rows.length <= 10 && (visibleFields.length <= 3 || (memoFields > 0 && visibleFields.length <= 4));
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

function formatDate(value: string) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!isoMatch) {
    return value;
  }

  const [, year, month, day] = isoMatch;
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1];
  return `${day} ${monthName} ${year}`;
}

function fieldWidth(field: FieldDefinition, section?: SectionDefinition) {
  if (section && (section.id === "currentWeek" || section.id === "lastWeek")) {
    return { size: Math.floor(CONTENT_WIDTH / Math.max(section.fields.length, 1)), type: WidthType.DXA };
  }
  if (section?.id === "serviceTypes") {
    if (field.id === "type") {
      return { size: 2200, type: WidthType.DXA };
    }
    if (field.id === "item") {
      return { size: 2200, type: WidthType.DXA };
    }
    if (field.id === "comment") {
      return { size: 5600, type: WidthType.DXA };
    }
  }
  if (section?.id === "productionBudget") {
    if (field.id === "category") {
      return { size: 2200, type: WidthType.DXA };
    }
    if (field.id === "weekBudget" || field.id === "weekActual") {
      return { size: 1700, type: WidthType.DXA };
    }
    if (field.id === "weekVariance") {
      return { size: 1100, type: WidthType.DXA };
    }
    if (field.id === "ytdBudget" || field.id === "ytdActual") {
      return { size: 1050, type: WidthType.DXA };
    }
    if (field.id === "ytdVariance") {
      return { size: 1300, type: WidthType.DXA };
    }
  }
  if (section?.id === "eorCycle") {
    if (field.id === "area") {
      return { size: 1700, type: WidthType.DXA };
    }
    if (field.id === "lastWeekOil" || field.id === "thisWeekOil") {
      return { size: 3200, type: WidthType.DXA };
    }
    if (field.id === "variance") {
      return { size: 1900, type: WidthType.DXA };
    }
  }
  if (section?.id === "facilityTreatment") {
    if (field.id === "stream") {
      return { size: 2600, type: WidthType.DXA };
    }
    if (field.id === "substream") {
      return { size: 3600, type: WidthType.DXA };
    }
    if (field.id === "ytd" || field.id === "thisWeek") {
      return { size: 1900, type: WidthType.DXA };
    }
  }
  if (section?.id === "other") {
    if (field.id === "type") {
      return { size: 1700, type: WidthType.DXA };
    }
    if (field.id === "facility") {
      return { size: 2200, type: WidthType.DXA };
    }
    if (field.id === "description") {
      return { size: 6100, type: WidthType.DXA };
    }
  }
  if (section?.id === "thermalProduction") {
    if (field.id === "well") {
      return { size: 900, type: WidthType.DXA };
    }
    if (field.id === "gross" || field.id === "netOil" || field.id === "loading") {
      return { size: 1100, type: WidthType.DXA };
    }
    if (field.id === "bsw") {
      return { size: 850, type: WidthType.DXA };
    }
    if (field.id === "chemical") {
      return { size: 1450, type: WidthType.DXA };
    }
    if (field.id === "comment") {
      return { size: 3500, type: WidthType.DXA };
    }
  }
  if (section?.id === "steamInjection") {
    if (field.id === "well") {
      return { size: 900, type: WidthType.DXA };
    }
    if (field.id === "rate" || field.id === "pressure" || field.id === "dryness") {
      return { size: 900, type: WidthType.DXA };
    }
    if (field.id === "temp") {
      return { size: 850, type: WidthType.DXA };
    }
    if (field.id === "totalSteamInjection") {
      return { size: 1450, type: WidthType.DXA };
    }
    if (field.id === "comment") {
      return { size: 4100, type: WidthType.DXA };
    }
  }
  if (section?.id === "wellJobs") {
    if (field.id === "well" || field.id === "lease" || field.id === "rig") {
      return { size: 850, type: WidthType.DXA };
    }
    if (field.id === "type") {
      return { size: 1200, type: WidthType.DXA };
    }
    if (field.id === "startDate" || field.id === "endDate") {
      return { size: 1100, type: WidthType.DXA };
    }
    if (field.id === "popDate") {
      return { size: 1450, type: WidthType.DXA };
    }
    if (field.id === "comment") {
      return { size: 2600, type: WidthType.DXA };
    }
  }
  if (section?.id === "downWellImpact") {
    if (field.id === "well" || field.id === "lease") {
      return { size: 800, type: WidthType.DXA };
    }
    if (field.id === "type") {
      return { size: 1300, type: WidthType.DXA };
    }
    if (field.id === "beforeWoProduction" || field.id === "afterWoProduction") {
      return { size: 1150, type: WidthType.DXA };
    }
    if (field.id === "popDate") {
      return { size: 1450, type: WidthType.DXA };
    }
    if (field.id === "comment") {
      return { size: 2500, type: WidthType.DXA };
    }
  }
  if (section?.id === "projects") {
    if (field.id === "project") {
      return { size: 1800, type: WidthType.DXA };
    }
    if (field.id === "subproject") {
      return { size: 1800, type: WidthType.DXA };
    }
    if (field.id === "activity") {
      return { size: 6400, type: WidthType.DXA };
    }
  }
  if (field.id === "id") {
    return { size: 650, type: WidthType.DXA };
  }
  if (field.id === "incidentCode") {
    return { size: 2400, type: WidthType.DXA };
  }
  if (field.id === "date") {
    return { size: 1800, type: WidthType.DXA };
  }
  if (field.id === "description" || field.id === "comment") {
    return { size: 9350, type: WidthType.DXA };
  }
  return undefined;
}

function productionSummaryTable(currentRows: DraftRow[], lastRows: DraftRow[]) {
  const items = [
    summaryStat("Current production total", statTotal(currentRows, "reportedProratedProduction")),
    summaryStat("Last production total", statTotal(lastRows, "reportedProratedProduction")),
    summaryStat("Production variance", statDelta(statAverage(currentRows, "reportedProratedProduction"), statAverage(lastRows, "reportedProratedProduction"))),
    summaryStat("Current proration avg", `${formatNumber(statAverage(currentRows, "reportedProration"))}%`),
    summaryStat("Last proration avg", `${formatNumber(statAverage(lastRows, "reportedProration"))}%`),
    summaryStat("Proration variance", formatSigned(statAverage(currentRows, "reportedProration") - statAverage(lastRows, "reportedProration"), "%")),
    summaryStat("Current prod lost total", statTotal(currentRows, "opsNightLoss")),
    summaryStat("Last prod lost total", statTotal(lastRows, "opsNightLoss")),
    summaryStat("Prod lost variance", statDelta(statAverage(currentRows, "opsNightLoss"), statAverage(lastRows, "opsNightLoss")))
  ];

  const rows: TableRow[] = [];
  for (let index = 0; index < items.length; index += 3) {
    rows.push(new TableRow({
      children: items.slice(index, index + 3).map((item) => new TableCell({
        width: { size: Math.floor(CONTENT_WIDTH / 3), type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: COLORS.panelAlt },
        borders: thinBorders(),
        margins: { top: 110, bottom: 110, left: 140, right: 140 },
        children: [
          new Paragraph({
            spacing: { after: 18 },
            children: [new TextRun({ text: item.label.toUpperCase(), font: FONT, size: 15, bold: true, color: COLORS.muted })]
          }),
          new Paragraph({
            spacing: { after: 0 },
            children: [new TextRun({ text: item.value, font: FONT, size: 22, bold: true, color: COLORS.ink })]
          })
        ]
      }))
    }));
  }

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows
  });
}

function productionTrendCharts(currentRows: DraftRow[], lastRows: DraftRow[]) {
  const charts = [
    productionChartBlock(
      "Reported Prorated Production",
      "m3/d",
      currentRows,
      lastRows,
      "reportedProratedProduction",
      COLORS.accent,
      "8A99A8",
      describeTrend("production", currentRows, lastRows, "reportedProratedProduction", "m3/d")
    ),
    productionChartBlock(
      "Reported Proration",
      "%",
      currentRows,
      lastRows,
      "reportedProration",
      COLORS.accent,
      "8A99A8",
      describeTrend("proration", currentRows, lastRows, "reportedProration", "%")
    ),
    productionChartBlock(
      "Prod Lost Ops Night Shift",
      "m3/d",
      currentRows,
      lastRows,
      "opsNightLoss",
      COLORS.accent,
      "8A99A8",
      describeTrend("loss", currentRows, lastRows, "opsNightLoss", "m3/d")
    )
  ];

  return charts.flatMap((chart) => [chart.table, bodyText(chart.note, COLORS.muted), spacer(40)]);
}

function productionChartBlock(
  title: string,
  unit: string,
  currentRows: DraftRow[],
  lastRows: DraftRow[],
  fieldId: string,
  currentColor: string,
  lastColor: string,
  note: string
) {
  const image = new ImageRun({
    type: "svg",
    data: Buffer.from(buildProductionChartSvg(title, unit, currentRows, lastRows, fieldId, currentColor, lastColor), "utf-8"),
    fallback: {
      type: "png",
      data: SVG_FALLBACK_PNG
    },
    transformation: { width: 640, height: 220 }
  });

  return {
    table: new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: COLORS.white },
              borders: thinBorders(),
              margins: { top: 110, bottom: 110, left: 120, right: 120 },
              children: [
                new Paragraph({
                  spacing: { after: 20 },
                  children: [new TextRun({ text: title, font: FONT, size: 18, bold: true, color: COLORS.ink })]
                }),
                new Paragraph({
                  spacing: { after: 0 },
                  children: [image]
                })
              ]
            })
          ]
        })
      ]
    }),
    note
  };
}

function buildProductionChartSvg(
  title: string,
  unit: string,
  currentRows: DraftRow[],
  lastRows: DraftRow[],
  fieldId: string,
  currentColor: string,
  lastColor: string
) {
  const width = 900;
  const height = 300;
  const left = 70;
  const right = 24;
  const top = 26;
  const bottom = 56;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const count = Math.max(currentRows.length, lastRows.length, 1);
  const currentValues = Array.from({ length: count }, (_, index) => parseNumber(currentRows[index]?.[fieldId] ?? "") ?? null);
  const lastValues = Array.from({ length: count }, (_, index) => parseNumber(lastRows[index]?.[fieldId] ?? "") ?? null);
  const labels = Array.from({ length: count }, (_, index) => chartLabel(currentRows[index]?.date || lastRows[index]?.date, index));
  const range = chartRange([...currentValues, ...lastValues]);
  const grid = 5;

  const x = (index: number) => left + (plotWidth * (count <= 1 ? 0.5 : index / (count - 1)));
  const y = (value: number | null) => {
    if (value === null) return null;
    const ratio = (value - range.min) / (range.max - range.min || 1);
    return top + plotHeight - ratio * plotHeight;
  };

  const currentPoints = currentValues
    .map((value, index) => {
      const yy = y(value);
      return yy === null ? null : { x: x(index), y: yy };
    })
    .filter((value): value is { x: number; y: number } => value !== null);
  const lastPoints = lastValues
    .map((value, index) => {
      const yy = y(value);
      return yy === null ? null : { x: x(index), y: yy };
    })
    .filter((value): value is { x: number; y: number } => value !== null);

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#F7F7F8"/>
    <rect x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" rx="10" fill="#FFFFFF" stroke="#D1D5DB"/>
    <text x="${left}" y="16" font-family="${FONT}" font-size="20" font-weight="700" fill="#1E1E1E">${escapeXml(title)} (${escapeXml(unit)})</text>
    ${Array.from({ length: grid }, (_, index) => {
      const yy = top + (plotHeight * index) / (grid - 1);
      const tick = range.max - ((range.max - range.min) * index) / (grid - 1);
      return `<g>
        <line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="#D1D5DB" stroke-width="1"/>
        <text x="10" y="${yy + 4}" font-family="${FONT}" font-size="12" fill="#6B7280">${escapeXml(formatChartTick(tick, unit))}</text>
      </g>`;
    }).join("")}
    ${labels.map((label, index) => `<text x="${x(index)}" y="${height - 18}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="#6B7280">${escapeXml(label)}</text>`).join("")}
    ${renderDotLine(currentPoints, currentColor, 2.1, 5)}
    ${renderSquareLine(lastPoints, lastColor, 3.4, 12)}
    ${currentValues.map((value, index) => value === null ? "" : `<circle cx="${x(index)}" cy="${y(value)}" r="4.4" fill="${currentColor}"/>`).join("")}
    ${lastValues.map((value, index) => {
      if (value === null) {
        return "";
      }
      const yy = y(value);
      if (yy === null) {
        return "";
      }
      return `<rect x="${x(index) - 4.4}" y="${yy - 4.4}" width="8.8" height="8.8" rx="1.2" fill="${lastColor}"/>`;
    }).join("")}
    <g>
      ${renderLegendDots(width - 250, 18, currentColor)}
      <text x="${width - 214}" y="${22}" font-family="${FONT}" font-size="12" fill="#1E1E1E">Current week</text>
      ${renderLegendSquares(width - 118, 18, lastColor)}
      <text x="${width - 82}" y="${22}" font-family="${FONT}" font-size="12" fill="#1E1E1E">Last week</text>
    </g>
  </svg>`;
}

function summaryStat(label: string, value: string) {
  return { label, value };
}

function statTotal(rows: DraftRow[], fieldId: string) {
  return formatNumber(rows.reduce((sum, row) => sum + (parseNumber(row[fieldId] ?? "") ?? 0), 0));
}

function statAverage(rows: DraftRow[], fieldId: string) {
  const values = rows.map((row) => parseNumber(row[fieldId] ?? "")).filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function statDelta(current: number, last: number) {
  return formatSigned(current - last, " m3/d");
}

function formatSigned(value: number, suffix: string) {
  const formatted = `${value > 0 ? "+" : ""}${formatNumber(value)}`;
  return `${formatted}${suffix}`;
}

function describeTrend(kind: "production" | "proration" | "loss", currentRows: DraftRow[], lastRows: DraftRow[], fieldId: string, unit: string) {
  const currentAvg = statAverage(currentRows, fieldId);
  const lastAvg = statAverage(lastRows, fieldId);
  const delta = currentAvg - lastAvg;
  const trend = delta > 0 ? "increased" : delta < 0 ? "declined" : "held flat";
  const variance = Math.abs(delta);
  const strongestDay = strongestVarianceDay(currentRows, lastRows, fieldId);

  if (kind === "loss") {
    return `Average ${kind === "loss" ? "night-shift losses" : kind} ${trend} versus last week by ${formatNumber(variance)} ${unit}. The widest day-on-day gap appeared on ${strongestDay.label}, where the variance reached ${formatNumber(Math.abs(strongestDay.delta))} ${unit}.`;
  }

  if (kind === "proration") {
    return `Average proration ${trend} versus last week by ${formatNumber(variance)} percentage points. The biggest daily variance appeared on ${strongestDay.label}, with a ${formatNumber(Math.abs(strongestDay.delta))} percentage-point gap between the two periods.`;
  }

  return `Average production ${trend} versus last week by ${formatNumber(variance)} ${unit}. The strongest variance was on ${strongestDay.label}, where the gap between current and last week reached ${formatNumber(Math.abs(strongestDay.delta))} ${unit}.`;
}

function strongestVarianceDay(currentRows: DraftRow[], lastRows: DraftRow[], fieldId: string) {
  const count = Math.max(currentRows.length, lastRows.length);
  let best = { label: "the period", delta: 0 };

  for (let index = 0; index < count; index += 1) {
    const current = parseNumber(currentRows[index]?.[fieldId] ?? "") ?? 0;
    const last = parseNumber(lastRows[index]?.[fieldId] ?? "") ?? 0;
    const delta = current - last;
    if (Math.abs(delta) >= Math.abs(best.delta)) {
      best = {
        label: chartLabel(currentRows[index]?.date || lastRows[index]?.date, index),
        delta
      };
    }
  }

  return best;
}

function chartRange(values: Array<number | null>) {
  const usable = values.filter((value): value is number => value !== null);
  if (!usable.length) {
    return { min: 0, max: 1 };
  }
  const min = Math.min(...usable);
  const max = Math.max(...usable);
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.08;
    return { min: Math.max(0, min - pad), max: max + pad };
  }
  const padding = (max - min) * 0.12;
  return { min: Math.max(0, min - padding), max: max + padding };
}

function formatChartTick(value: number, unit: string) {
  if (unit === "%") {
    return `${formatNumber(value)}%`;
  }
  return formatNumber(value);
}

function chartLabel(rawDate: string | undefined, index: number) {
  if (!rawDate) {
    return `Day ${index + 1}`;
  }
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDate);
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(rawDate);
  if (slash) {
    const date = new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return `Day ${index + 1}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderDotLine(points: Array<{ x: number; y: number }>, color: string, radius: number, spacing: number) {
  if (points.length < 2) {
    return "";
  }

  let circles = "";
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(distance / spacing));

    for (let step = 0; step <= steps; step += 1) {
      const t = steps === 0 ? 0 : step / steps;
      const cx = start.x + dx * t;
      const cy = start.y + dy * t;
      circles += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color}"/>`;
    }
  }

  return circles;
}

function renderSquareLine(points: Array<{ x: number; y: number }>, color: string, size: number, spacing: number) {
  if (points.length < 2) {
    return "";
  }

  let squares = "";
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(distance / spacing));

    for (let step = 0; step <= steps; step += 1) {
      const t = steps === 0 ? 0 : step / steps;
      const cx = start.x + dx * t;
      const cy = start.y + dy * t;
      squares += `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="0.8" fill="${color}"/>`;
    }
  }

  return squares;
}

function renderLegendDots(x: number, y: number, color: string) {
  const parts: string[] = [];
  for (let index = 0; index < 5; index += 1) {
    const cx = x + index * 6;
    parts.push(`<circle cx="${cx}" cy="${y}" r="2.1" fill="${color}"/>`);
  }
  return parts.join("");
}

function renderLegendSquares(x: number, y: number, color: string) {
  const parts: string[] = [];
  for (let index = 0; index < 5; index += 1) {
    const cx = x + index * 6;
    parts.push(`<rect x="${cx - 1.9}" y="${y - 1.9}" width="3.8" height="3.8" rx="0.8" fill="${color}"/>`);
  }
  return parts.join("");
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function hasMeaningfulValue(value: string) {
  return normalizeText(value).length > 0;
}

function humanizeStatus(status: string) {
  if (status === "in_progress") {
    return "In progress";
  }
  if (status === "not_started") {
    return "Not started";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusColors(status: string): [string, string] {
  if (status === "approved" || status === "submitted") {
    return [COLORS.statusGood, humanizeStatus(status)];
  }
  if (status === "draft" || status === "reopened") {
    return [COLORS.statusDraft, humanizeStatus(status)];
  }
  return [COLORS.statusPending, status === "missing" ? "No update" : humanizeStatus(status)];
}

function noBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
    bottom: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
    left: { style: BorderStyle.NONE, size: 0, color: COLORS.white },
    right: { style: BorderStyle.NONE, size: 0, color: COLORS.white }
  };
}

function thinBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
    left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
    right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line }
  };
}
