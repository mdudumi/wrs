"use client";

import { ChevronDown, ChevronUp, ClipboardPaste, Copy, FilePlus2, Plus, Save, Send, Trash2 } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ImportedSourcePanel } from "@/components/ImportedSourcePanel";
import { ProductionComparisonChart } from "@/components/ProductionComparisonChart";
import { getSelectedPeriod } from "@/lib/local-store";
import { buildStoredPayload, createEmptyDraft, draftFromPayload } from "@/lib/payload-mapping";
import { zoneOptions, padOptions } from "@/lib/reference-data";
import { getDepartmentEntry, listJobTypes, listReportingPeriods, listRigs, listWells, upsertDepartmentEntry } from "@/lib/reporting-data";
import type { DepartmentEntryPayload, DraftData, DraftRow, JobTypeReferenceRecord, ModuleDefinition, ReportingPeriodRecord, RigReferenceRecord, SectionDefinition, WellReferenceRecord } from "@/lib/types";

const staticOptionSets: Record<string, string[]> = {
  zones: zoneOptions,
  pads: padOptions
};

type Row = DraftRow;

export function ModuleForm({ module }: { module: ModuleDefinition }) {
  const [draft, setDraft] = useState<DraftData>(createEmptyDraft(module));
  const [status, setStatus] = useState("Loading entry");
  const [periodId, setPeriodId] = useState("");
  const [loading, setLoading] = useState(true);
  const [importedPayload, setImportedPayload] = useState<DepartmentEntryPayload | null>(null);
  const [hasEntry, setHasEntry] = useState(false);
  const [periods, setPeriods] = useState<ReportingPeriodRecord[]>([]);
  const [sourcePeriodId, setSourcePeriodId] = useState("");
  const [copiedDraft, setCopiedDraft] = useState<DraftData | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<DepartmentEntryPayload | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [wells, setWells] = useState<WellReferenceRecord[]>([]);
  const [rigs, setRigs] = useState<RigReferenceRecord[]>([]);
  const [jobTypes, setJobTypes] = useState<JobTypeReferenceRecord[]>([]);

  const wellNames = useMemo(() => {
    return mergeOptionValues(
      wells.map((item) => item.well_name).filter(Boolean),
      collectCurrentOptionValues(module, draft, "wells")
    );
  }, [draft, module.sections, wells]);

  const rigNames = useMemo(() => {
    return mergeOptionValues(
      rigs.map((item) => item.name).filter(Boolean),
      collectCurrentOptionValues(module, draft, "rigs")
    );
  }, [draft, module.sections, rigs]);

  const wellJobTypeNames = useMemo(() => {
    return mergeOptionValues(
      jobTypes.filter((item) => item.group_key === "engineering_well_jobs").map((item) => item.name).filter(Boolean),
      collectCurrentOptionValues(module, draft, "jobTypesWellJobs")
    );
  }, [draft, jobTypes, module.sections]);

  const downWellImpactTypeNames = useMemo(() => {
    return mergeOptionValues(
      jobTypes.filter((item) => item.group_key === "engineering_down_well_impact").map((item) => item.name).filter(Boolean),
      collectCurrentOptionValues(module, draft, "jobTypesDownWellImpact")
    );
  }, [draft, jobTypes, module.sections]);

  const wellLeaseByName = useMemo(
    () => Object.fromEntries(
      wells
        .filter((item) => item.well_name)
        .map((item) => [item.well_name, item.lease ?? ""])
    ) as Record<string, string>,
    [wells]
  );

  const optionSets = useMemo<Record<string, string[]>>(
    () => ({
      ...staticOptionSets,
      wells: wellNames,
      rigs: rigNames,
      jobTypesWellJobs: wellJobTypeNames,
      jobTypesDownWellImpact: downWellImpactTypeNames
    }),
    [downWellImpactTypeNames, rigNames, wellJobTypeNames, wellNames]
  );

  async function getEntryForCurrentModule(targetPeriodId: string) {
    const directEntry = await getDepartmentEntry(targetPeriodId, module.id);
    if (directEntry || module.id !== "eor") {
      return { entry: directEntry, fromLegacyReservoir: false };
    }

    const legacyReservoirEntry = await getDepartmentEntry(targetPeriodId, "reservoir");
    return {
      entry: legacyReservoirEntry,
      fromLegacyReservoir: Boolean(legacyReservoirEntry)
    };
  }

  useEffect(() => {
    const selected = getSelectedPeriod();
    setPeriodId(selected);
    const refresh = () => {
      const nextPeriodId = getSelectedPeriod();
      setPeriodId(nextPeriodId);
    };
    window.addEventListener("period-change", refresh);
    return () => window.removeEventListener("period-change", refresh);
  }, [module]);

  useEffect(() => {
    let alive = true;
    listReportingPeriods().then((items) => {
      if (!alive) return;
      setPeriods(items);
    }).catch(() => {
      if (!alive) return;
      setPeriods([]);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    listWells().then((items) => {
      if (!alive) return;
      setWells(items);
    }).catch(() => {
      if (!alive) return;
      setWells([]);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    listRigs().then((items) => {
      if (!alive) return;
      setRigs(items);
    }).catch(() => {
      if (!alive) return;
      setRigs([]);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    listJobTypes().then((items) => {
      if (!alive) return;
      setJobTypes(items);
    }).catch(() => {
      if (!alive) return;
      setJobTypes([]);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!Object.keys(wellLeaseByName).length) {
      return;
    }

    setDraft((current) => applyLinkedLeases(module, current, wellLeaseByName));
  }, [module, wellLeaseByName]);

  useEffect(() => {
    if (!periodId) return;
    let alive = true;
    setLoading(true);
    setStatus("Loading entry");
    getEntryForCurrentModule(periodId).then(async ({ entry, fromLegacyReservoir }) => {
      if (!alive) return;
      const hydrated = draftFromPayload(module, entry?.payload);
      let normalizedDraft = normalizeDraftForDisplay(module, hydrated.draft);
      const carryForward = await maybeCarryForwardProductionLastWeek(module, normalizedDraft, periodId, periods);
      normalizedDraft = normalizeDraftForDisplay(module, carryForward.draft);

      setDraft(normalizedDraft);
      setImportedPayload(hydrated.importedPayload);
      setExpandedSections(defaultExpandedSections(module, normalizedDraft));
      setHasEntry(Boolean(entry) && !fromLegacyReservoir);
      setStatus(
        entry
          ? fromLegacyReservoir
            ? `Loaded legacy reservoir data for EOR${carryForward.fromPeriodLabel ? ` · Last Week copied from ${carryForward.fromPeriodLabel}` : ""}`
            : `Loaded ${entry.status} entry${carryForward.fromPeriodLabel ? ` · Last Week copied from ${carryForward.fromPeriodLabel}` : ""}`
          : carryForward.fromPeriodLabel
            ? `No saved entry yet · Last Week copied from ${carryForward.fromPeriodLabel}`
            : "No saved entry yet"
      );
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      const emptyDraft = createEmptyDraft(module);
      setDraft(emptyDraft);
      setImportedPayload(null);
      setExpandedSections(defaultExpandedSections(module, emptyDraft));
      setHasEntry(false);
      setStatus("Unable to load entry");
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [module, periodId, periods]);

  function updateCell(section: SectionDefinition, rowIndex: number, fieldId: string, value: string) {
    setDraft((current) => {
      const rows = [...(current[section.id] ?? [])];
      const nextRow = { ...rows[rowIndex], [fieldId]: value };

      if (fieldId === "well" && section.fields.some((field) => field.id === "lease")) {
        const linkedLease = wellLeaseByName[value];
        if (linkedLease !== undefined) {
          nextRow.lease = linkedLease;
        } else if (!value) {
          nextRow.lease = "";
        }
      }

      rows[rowIndex] = nextRow;
      return { ...current, [section.id]: normalizeSectionRows(section, rows) };
    });
  }

  function addRow(section: SectionDefinition) {
    setExpandedSections((current) => ({ ...current, [section.id]: true }));
    setDraft((current) => ({
      ...current,
      [section.id]: normalizeSectionRows(section, [...(current[section.id] ?? []), emptyRow(section)])
    }));
  }

  function deleteRow(section: SectionDefinition, rowIndex: number) {
    setDraft((current) => {
      const rows = [...(current[section.id] ?? [])].filter((_, index) => index !== rowIndex);
      return { ...current, [section.id]: normalizeSectionRows(section, rows.length ? rows : [emptyRow(section)]) };
    });
  }

  async function save(nextStatus: "draft" | "submitted", statusText: string) {
    if (!periodId) {
      setStatus("Select a reporting week first");
      return;
    }
    try {
      await upsertDepartmentEntry(periodId, module.id, buildStoredPayload(module, draft, importedPayload), nextStatus);
      setHasEntry(true);
      setStatus(statusText);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save entry");
    }
  }

  async function createNewEntry() {
    if (!periodId) {
      setStatus("Select a reporting week first");
      return;
    }

    try {
      const existingEntry = await getDepartmentEntry(periodId, module.id);
      if (existingEntry) {
        const hydrated = draftFromPayload(module, existingEntry.payload);
        const normalizedDraft = normalizeDraftForDisplay(module, hydrated.draft);
        setDraft(normalizedDraft);
        setImportedPayload(hydrated.importedPayload);
        setExpandedSections(defaultExpandedSections(module, normalizedDraft));
        setHasEntry(true);
        setStatus("Current week entry loaded for editing");
        return;
      }

      if (module.id === "eor") {
        const legacyReservoirEntry = await getDepartmentEntry(periodId, "reservoir");
        if (legacyReservoirEntry) {
          const hydrated = draftFromPayload(module, legacyReservoirEntry.payload);
          const normalizedDraft = normalizeDraftForDisplay(module, hydrated.draft);
          setDraft(normalizedDraft);
          setImportedPayload(hydrated.importedPayload);
          setExpandedSections(defaultExpandedSections(module, normalizedDraft));
          setHasEntry(false);
          setStatus("Loaded existing reservoir data into EOR. Save draft or submit to create the dedicated EOR entry.");
          return;
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to check the current week entry");
      return;
    }

    const blank = createEmptyDraft(module);
    const carryForward = await maybeCarryForwardProductionLastWeek(module, blank, periodId, periods);
    const normalizedDraft = normalizeDraftForDisplay(module, carryForward.draft);
    setDraft(normalizedDraft);
    setImportedPayload(null);
    setExpandedSections(defaultExpandedSections(module, normalizedDraft));
    try {
      await upsertDepartmentEntry(periodId, module.id, buildStoredPayload(module, carryForward.draft, null), "draft");
      setHasEntry(true);
      setStatus(carryForward.fromPeriodLabel ? `New weekly entry created · Last Week copied from ${carryForward.fromPeriodLabel}` : "New weekly entry created");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create a new entry");
    }
  }

  async function copyFromSelectedWeek() {
    if (!sourcePeriodId) {
      setStatus("Choose a week to copy from");
      return;
    }
    try {
      const { entry, fromLegacyReservoir } = await getEntryForCurrentModule(sourcePeriodId);
      if (!entry) {
        setStatus("No entry exists in that source week");
        return;
      }
      const hydrated = draftFromPayload(module, entry.payload);
      setCopiedDraft(cloneDraft(hydrated.draft));
      setCopiedPayload(hydrated.importedPayload);
      const label = periods.find((item) => item.id === sourcePeriodId)?.label ?? "selected week";
      setStatus(fromLegacyReservoir ? `Copied legacy reservoir data into EOR from ${label}` : `Copied ${module.name} data from ${label}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to copy the selected week");
    }
  }

  function pasteIntoCurrentWeek() {
    if (!copiedDraft) {
      setStatus("Copy a source week first");
      return;
    }
    const nextDraft = cloneDraft(copiedDraft);
    setDraft(normalizeDraftForDisplay(module, nextDraft));
    setImportedPayload(copiedPayload);
    setExpandedSections(defaultExpandedSections(module, nextDraft));
    setHasEntry(false);
    setStatus("Pasted into the current week. Save draft to keep it.");
  }

  function toggleSection(sectionId: string) {
    setExpandedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  const copyOptions = periods.filter((item) => item.id !== periodId);

  return (
    <div className="grid">
      <div className="card metric">
        <div>
          <h2>{module.name}</h2>
          <p>{hasEntry ? "Enter this week’s data, copy forward a prior week, save drafts, and submit to the admin review queue." : "Start a fresh entry for the selected reporting week, then save or submit it."}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="button" onClick={createNewEntry}><FilePlus2 size={16} /> {hasEntry ? "Edit current week" : "New entry"}</button>
          <button className="button" onClick={() => save("draft", "Draft saved to Supabase")}><Save size={16} /> Save draft</button>
          <button className="button primary" onClick={() => save("submitted", "Submitted for admin review")}><Send size={16} /> Submit</button>
        </div>
      </div>
      <div className="card copy-toolbar">
        <label className="copy-select">
          <span>Copy from week</span>
          <select value={sourcePeriodId} onChange={(event) => setSourcePeriodId(event.target.value)}>
            <option value="">Select source week...</option>
            {copyOptions.map((period) => (
              <option value={period.id} key={period.id}>{period.label}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="button" onClick={copyFromSelectedWeek}><Copy size={16} /> Copy selected week</button>
          <button className="button" onClick={pasteIntoCurrentWeek}><ClipboardPaste size={16} /> Paste to current week</button>
        </div>
      </div>
      <span className="pill">{status}</span>
      {loading && <div className="card"><p>Loading the selected week from Supabase.</p></div>}
      {module.sections.map((section) => {
        const rows = draft[section.id] ?? [];
        const hasValues = hasMeaningfulRows(rows);
        const isExpanded = expandedSections[section.id] ?? hasValues;

        return (
          <section className={`section-panel ${isExpanded ? "expanded" : "collapsed"}`} key={section.id}>
            <div className="section-title">
              <div>
                <div className="eyebrow">{section.kind}</div>
                <h2>{section.name}</h2>
                <span className="section-state">{hasValues ? `${countMeaningfulRows(rows)} row${countMeaningfulRows(rows) === 1 ? "" : "s"} entered` : "Collapsed until needed"}</span>
              </div>
              <div className="section-actions">
                {isExpanded && <button className="button" onClick={() => addRow(section)}><Plus size={16} /> Row</button>}
                <button className="button ghost" onClick={() => toggleSection(section.id)}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {isExpanded ? "Collapse" : "Expand"}
                </button>
              </div>
            </div>
            {isExpanded && (
              <EditableTable
                section={section}
                rows={rows}
                optionSets={optionSets}
                onChange={(rowIndex, fieldId, value) => updateCell(section, rowIndex, fieldId, value)}
                onDelete={(rowIndex) => deleteRow(section, rowIndex)}
              />
            )}
          </section>
        );
      })}
      {module.id === "production" && (
        <ProductionComparisonChart
          currentRows={draft.currentWeek ?? []}
          lastRows={draft.lastWeek ?? []}
        />
      )}
      {importedPayload && <ImportedSourcePanel payload={importedPayload} />}
    </div>
  );
}

function EditableTable({ section, rows, optionSets, onChange, onDelete }: { section: SectionDefinition; rows: Row[]; optionSets: Record<string, string[]>; onChange: (rowIndex: number, fieldId: string, value: string) => void; onDelete: (rowIndex: number) => void }) {
  if (!rows.length) return <div className="empty-state">No rows yet.</div>;

  const visibleFields = getVisibleFieldsForSection(section);
  const columnWidths = getColumnWidths(section, rows, visibleFields);
  const tableMinWidth = getTableMinWidth(columnWidths);

  return (
    <>
      <div className="table-wrap">
      <table className="data-table responsive-data-table" style={{ width: `max(100%, ${tableMinWidth}px)` }}>
        <colgroup>
          <col className="row-num-col" />
          {visibleFields.map((field) => (
            <col
              key={field.id}
              style={columnWidths[field.id] ? { width: columnWidths[field.id] } : undefined}
            />
          ))}
          <col className="row-actions-col" />
        </colgroup>
        <thead>
          <tr>
            <th className="row-num">#</th>
            {visibleFields.map((field) => <th key={field.id}>{field.label}</th>)}
            <th className="row-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td className="row-num">{rowIndex + 1}</td>
              {visibleFields.map((field) => (
              <td key={field.id} className={field.type === "memo" ? "memo-cell" : undefined}>
                  {field.type === "memo" ? (
                    <AutoResizeTextarea
                      value={row[field.id] ?? ""}
                      onChange={(value) => onChange(rowIndex, field.id, value)}
                    />
                  ) : shouldUseWrappedTextArea(section, field) ? (
                    <AutoResizeTextarea
                      value={row[field.id] ?? ""}
                      onChange={(value) => onChange(rowIndex, field.id, value)}
                      className="compact-wrap-textarea"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={row[field.id] ?? ""}
                      onChange={(e) => onChange(rowIndex, field.id, e.target.value)}
                    >
                      <option value="">Select...</option>
                      {(field.options ?? optionSets[field.optionSet ?? ""] ?? []).map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      className={inputClassName(section, field, row[field.id] ?? "")}
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={row[field.id] ?? ""}
                      readOnly={Boolean(field.calculated)}
                      onChange={(e) => onChange(rowIndex, field.id, e.target.value)}
                    />
                  )}
                </td>
              ))}
              <td className="row-actions">
                <button className="icon-button" title="Delete row" onClick={() => onDelete(rowIndex)}><Trash2 size={15} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <SectionSummary section={section} rows={rows} />
    </>
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  minRows = 1,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frameId = 0;

    const syncHeight = () => {
      const computed = window.getComputedStyle(element);
      const parsedLineHeight = Number.parseFloat(computed.lineHeight);
      const parsedFontSize = Number.parseFloat(computed.fontSize || "16");
      const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : parsedFontSize * 1.25;
      const minimumHeight = Math.max(38, Math.ceil(lineHeight * minRows) + 20);
      element.style.height = "0px";
      const targetHeight = Math.max(element.scrollHeight, minimumHeight);
      element.style.height = `${targetHeight}px`;
    };

    const scheduleSync = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        syncHeight();
      });
    };

    scheduleSync();
    frameId = requestAnimationFrame(() => {
      syncHeight();
    });

    const resizeObserver = new ResizeObserver(() => {
      scheduleSync();
    });

    resizeObserver.observe(element);
    if (element.parentElement) {
      resizeObserver.observe(element.parentElement);
    }
    if (element.closest("table")) {
      resizeObserver.observe(element.closest("table") as Element);
    }

    window.addEventListener("resize", scheduleSync);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleSync);
      resizeObserver.disconnect();
    };
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={className}
      rows={minRows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function shouldUseWrappedTextArea(section: SectionDefinition, field: { id: string }) {
  return (
    (section.id === "projects" && (field.id === "project" || field.id === "subproject")) ||
    (section.id === "serviceTypes" && field.id === "item")
  );
}

function SectionSummary({ section, rows }: { section: SectionDefinition; rows: Row[] }) {
  const metrics = [
    ...(section.totals ?? []).map((fieldId) => ({ label: `Total ${fieldLabel(section, fieldId)}`, value: sum(rows, fieldId).toLocaleString(undefined, { maximumFractionDigits: 2 }) })),
    ...(section.averages ?? []).map((fieldId) => ({ label: `Average ${fieldLabel(section, fieldId)}`, value: average(rows, fieldId).toLocaleString(undefined, { maximumFractionDigits: 2 }) }))
  ];

  if (!metrics.length) return null;

  return (
    <div className="summary-grid">
      {metrics.map((metric) => (
        <div className="summary-tile" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      ))}
    </div>
  );
}

function fieldLabel(section: SectionDefinition, fieldId: string) {
  return section.fields.find((field) => field.id === fieldId)?.label ?? fieldId;
}

function inputClassName(section: SectionDefinition, field: { calculated?: string }, value: string) {
  if (!field.calculated) {
    return undefined;
  }

  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return "calculated-input";
  }

  if (numeric > 0) {
    return "calculated-input variance-positive";
  }

  if (numeric < 0) {
    return "calculated-input variance-negative";
  }

  return "calculated-input variance-neutral";
}

function sum(rows: Row[], fieldId: string) {
  return rows.reduce((total, row) => total + (Number.parseFloat(row[fieldId]) || 0), 0);
}

function average(rows: Row[], fieldId: string) {
  const values = rows.map((row) => Number.parseFloat(row[fieldId])).filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function emptyRow(section: SectionDefinition) {
  return applyCalculatedFields(section, Object.fromEntries(section.fields.map((field) => [field.id, ""])));
}

function cloneDraft(draft: DraftData) {
  return JSON.parse(JSON.stringify(draft)) as DraftData;
}

function defaultExpandedSections(module: ModuleDefinition, draft: DraftData) {
  return Object.fromEntries(module.sections.map((section) => [section.id, hasMeaningfulRows(draft[section.id] ?? [])]));
}

function hasMeaningfulRows(rows: Row[]) {
  return rows.some((row) => Object.values(row).some((value) => `${value ?? ""}`.trim() !== ""));
}

function countMeaningfulRows(rows: Row[]) {
  return rows.filter((row) => Object.values(row).some((value) => `${value ?? ""}`.trim() !== "")).length;
}

function getColumnWidths(section: SectionDefinition, rows: Row[], visibleFields = section.fields) {
  return Object.fromEntries(visibleFields.map((field) => {
    if (field.type === "memo") {
      return [field.id, undefined];
    }

    const presetWidth = FIELD_WIDTHS[field.id];
    if (presetWidth) {
      return [field.id, presetWidth];
    }

    if (field.type === "date") {
      return [field.id, "164px"];
    }

    if (field.type === "select") {
      return [field.id, "156px"];
    }

    if (field.type === "number") {
      return [field.id, "152px"];
    }

    const longestValue = rows.reduce((max, row) => Math.max(max, `${row[field.id] ?? ""}`.trim().length), 0);
    const baseLength = Math.max(field.label.length, longestValue) + 1;

    return [field.id, `${Math.min(Math.max(baseLength * 8, 120), 240)}px`];
  })) as Record<string, string | undefined>;
}

function getTableMinWidth(columnWidths: Record<string, string | undefined>) {
  const baseWidth = 44 + 76;
  return Object.values(columnWidths).reduce((total, width) => total + widthToPixels(width), baseWidth);
}

function widthToPixels(width: string | undefined) {
  if (!width) {
    return 320;
  }

  const match = /^([\d.]+)px$/.exec(width);
  if (match) {
    return Number(match[1]);
  }

  return 160;
}

function getVisibleFieldsForSection(section: SectionDefinition) {
  return usesImplicitRowNumber(section)
    ? section.fields.filter((field) => field.id !== "id")
    : section.fields;
}

function normalizeDraftForDisplay(module: ModuleDefinition, draft: DraftData) {
  return Object.fromEntries(module.sections.map((section) => [
    section.id,
    normalizeSectionRows(section, draft[section.id] ?? [emptyRow(section)])
  ])) as DraftData;
}

function normalizeSectionRows(section: SectionDefinition, rows: Row[]) {
  const normalizedRows = rows.map((row) => applyCalculatedFields(section, row));

  if (!usesImplicitRowNumber(section)) {
    return normalizedRows;
  }

  return normalizedRows.map((row, index) => ({
    ...row,
    id: Object.values(row).some((value) => `${value ?? ""}`.trim() !== "") ? `${index + 1}` : row.id ?? ""
  }));
}

function usesImplicitRowNumber(section: SectionDefinition) {
  return (
    section.fields.length === 2 &&
    section.fields[0]?.id === "id" &&
    (section.fields[1]?.id === "description" || section.fields[1]?.id === "comment")
  );
}

function collectCurrentOptionValues(module: ModuleDefinition, draft: DraftData, optionSet: string) {
  return module.sections
    .flatMap((section) => {
      const matchingFields = section.fields.filter((field) => field.optionSet === optionSet);
      if (!matchingFields.length) {
        return [];
      }

      return (draft[section.id] ?? []).flatMap((row) =>
        matchingFields
          .map((field) => row[field.id] ?? "")
          .filter((value) => value.trim().length > 0)
      );
    });
}

function mergeOptionValues(databaseValues: string[], draftValues: string[]) {
  return Array.from(new Set([...databaseValues, ...draftValues])).sort((left, right) => left.localeCompare(right));
}

function applyCalculatedFields(section: SectionDefinition, row: Row) {
  const nextRow = { ...row };

  section.fields.forEach((field) => {
    if (!field.calculated) {
      return;
    }

    nextRow[field.id] = evaluateCalculatedField(field.calculated, nextRow);
  });

  return nextRow;
}

function evaluateCalculatedField(expression: string, row: Row) {
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

function applyLinkedLeases(module: ModuleDefinition, draft: DraftData, wellLeaseByName: Record<string, string>) {
  let changed = false;

  const nextDraft = Object.fromEntries(module.sections.map((section) => {
    if (!section.fields.some((field) => field.id === "well") || !section.fields.some((field) => field.id === "lease")) {
      return [section.id, draft[section.id] ?? []];
    }

    const nextRows = (draft[section.id] ?? []).map((row) => {
      if ((row.lease ?? "").trim() !== "") {
        return row;
      }

      const linkedLease = wellLeaseByName[row.well ?? ""];
      if (linkedLease === undefined || linkedLease === "") {
        return row;
      }

      changed = true;
      return { ...row, lease: linkedLease };
    });

    return [section.id, nextRows];
  })) as DraftData;

  return changed ? nextDraft : draft;
}

const FIELD_WIDTHS: Record<string, string> = {
  incidentCode: "192px",
  date: "164px",
  well: "92px",
  lease: "120px",
  type: "176px",
  startDate: "164px",
  endDate: "164px",
  rig: "110px",
  popDate: "196px",
  beforeWoProduction: "164px",
  afterWoProduction: "164px",
  reportedProration: "160px",
  unproratedProduction: "188px",
  reportedProratedProduction: "224px",
  opsNightLoss: "196px",
  waterRoomLoss: "180px",
  project: "260px",
  position: "190px",
  zone: "120px",
  depth: "152px",
  conversionId: "196px",
  injectionWell: "156px",
  pad: "110px",
  mixingArea: "170px",
  firstInjectionDate: "184px",
  area: "170px",
  item: "260px",
  facility: "170px",
  category: "210px",
  weekBudget: "170px",
  weekActual: "170px",
  weekVariance: "150px",
  ytdBudget: "140px",
  ytdActual: "140px",
  ytdVariance: "170px",
  lastWeekOil: "196px",
  thisWeekOil: "196px",
  variance: "150px",
  stream: "240px",
  substream: "280px",
  volume: "140px",
  bsw: "110px",
  gross: "120px",
  netOil: "130px",
  loading: "120px",
  chemical: "190px",
  pressure: "120px",
  temp: "100px",
  dryness: "110px",
  totalSteamInjection: "196px",
  complete: "120px",
  subproject: "260px",
  rigName: "120px",
  wellPadCellar: "210px",
  td: "190px",
  sra: "170px",
  afe: "120px",
  programGeoDirectional: "220px",
  comment: "360px",
  comments: "360px",
  description: "360px",
  activity: "440px",
  operations: "360px",
  details: "360px",
  currentOperation: "360px",
  drillingProgram: "360px"
};

async function maybeCarryForwardProductionLastWeek(module: ModuleDefinition, draft: DraftData, periodId: string, periods: ReportingPeriodRecord[]) {
  if (module.id !== "production") {
    return { draft, fromPeriodLabel: null as string | null };
  }

  if (hasMeaningfulRows(draft.lastWeek ?? [])) {
    return { draft, fromPeriodLabel: null as string | null };
  }

  const currentIndex = periods.findIndex((period) => period.id === periodId);
  if (currentIndex <= 0) {
    return { draft, fromPeriodLabel: null as string | null };
  }

  const previousPeriod = periods[currentIndex - 1];
  const previousEntry = await getDepartmentEntry(previousPeriod.id, module.id);
  if (!previousEntry) {
    return { draft, fromPeriodLabel: null as string | null };
  }

  const previousDraft = draftFromPayload(module, previousEntry.payload).draft;
  const previousCurrentWeek = cloneDraftRows(previousDraft.currentWeek ?? []);
  if (!hasMeaningfulRows(previousCurrentWeek)) {
    return { draft, fromPeriodLabel: null as string | null };
  }

  return {
    draft: {
      ...draft,
      lastWeek: previousCurrentWeek
    },
    fromPeriodLabel: previousPeriod.label
  };
}

function cloneDraftRows(rows: Row[]) {
  return rows.map((row) => ({ ...row }));
}
