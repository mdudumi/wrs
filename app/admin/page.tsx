"use client";

import { ChevronDown, ChevronUp, Download, Eye, FileCog, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminAccessGuard } from "@/components/AdminAccessGuard";
import { AppShell } from "@/components/AppShell";
import { modules } from "@/lib/modules";
import { getSelectedPeriod } from "@/lib/local-store";
import {
  listDepartmentEntryStatuses,
  listJobTypes,
  listReportingPeriods,
  listRigs,
  listWells,
  saveJobTypes,
  saveRigs,
  saveWells
} from "@/lib/reporting-data";
import type {
  JobTypeReferenceRecord,
  ReportingPeriodRecord,
  RigReferenceRecord,
  WellReferenceRecord
} from "@/lib/types";

type ReferenceColumn<T> = {
  key: keyof T;
  label: string;
  kind?: "text" | "active";
  placeholder?: string;
};

type ReferenceEditorProps<T extends { id: string; active: boolean | null }> = {
  title: string;
  description: string;
  status: string;
  rows: T[];
  setRows: React.Dispatch<React.SetStateAction<T[]>>;
  createRow: () => T;
  onSave: () => Promise<void>;
  columns: ReferenceColumn<T>[];
  note?: string;
};

const wellColumns: ReferenceColumn<WellReferenceRecord>[] = [
  { key: "well_name", label: "Well name", placeholder: "6188" },
  { key: "lease", label: "Lease", placeholder: "Pad D" },
  { key: "active", label: "Status", kind: "active" }
];

const rigColumns: ReferenceColumn<RigReferenceRecord>[] = [
  { key: "name", label: "Rig name", placeholder: "R15" },
  { key: "active", label: "Status", kind: "active" }
];

const jobTypeColumns: ReferenceColumn<JobTypeReferenceRecord>[] = [
  { key: "name", label: "Job type", placeholder: "HIT" },
  { key: "group_key", label: "Group key", placeholder: "engineering_well_jobs" },
  { key: "active", label: "Status", kind: "active" }
];

export default function AdminPage() {
  const [periodId, setPeriodId] = useState("");
  const [periods, setPeriods] = useState<ReportingPeriodRecord[]>([]);
  const [statuses, setStatuses] = useState<Array<{ department_id: string; status: string; updated_at: string }>>([]);

  const [wells, setWells] = useState<WellReferenceRecord[]>([]);
  const [rigs, setRigs] = useState<RigReferenceRecord[]>([]);
  const [jobTypes, setJobTypes] = useState<JobTypeReferenceRecord[]>([]);

  const [wellsStatus, setWellsStatus] = useState("Loading wells");
  const [rigsStatus, setRigsStatus] = useState("Loading rigs");
  const [jobTypesStatus, setJobTypesStatus] = useState("Loading job types");

  useEffect(() => {
    setPeriodId(getSelectedPeriod());
    const onPeriodChange = (event: Event) => setPeriodId((event as CustomEvent<string>).detail);
    window.addEventListener("period-change", onPeriodChange);
    return () => window.removeEventListener("period-change", onPeriodChange);
  }, []);

  useEffect(() => {
    let alive = true;
    listReportingPeriods().then((items) => {
      if (alive) setPeriods(items);
    }).catch(() => {
      if (alive) setPeriods([]);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!periodId) return;
    let alive = true;
    listDepartmentEntryStatuses(periodId).then((items) => {
      if (alive) setStatuses(items);
    }).catch(() => {
      if (alive) setStatuses([]);
    });
    return () => {
      alive = false;
    };
  }, [periodId]);

  useEffect(() => {
    let alive = true;
    listWells().then((items) => {
      if (!alive) return;
      setWells(items);
      setWellsStatus(`${items.length} well${items.length === 1 ? "" : "s"} loaded`);
    }).catch((error) => {
      if (!alive) return;
      setWells([]);
      setWellsStatus(error instanceof Error ? error.message : "Unable to load wells");
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
      setRigsStatus(`${items.length} rig${items.length === 1 ? "" : "s"} loaded`);
    }).catch((error) => {
      if (!alive) return;
      setRigs([]);
      setRigsStatus(error instanceof Error ? error.message : "Unable to load rigs");
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
      setJobTypesStatus(`${items.length} job type${items.length === 1 ? "" : "s"} loaded`);
    }).catch((error) => {
      if (!alive) return;
      setJobTypes([]);
      setJobTypesStatus(error instanceof Error ? error.message : "Unable to load job types");
    });
    return () => {
      alive = false;
    };
  }, []);

  const period = periods.find((item) => item.id === periodId) ?? periods[0];
  const rows = modules.map((module) => ({
    module,
    saved: statuses.find((entry) => entry.department_id === module.id) ?? null
  }));
  const periodLabel = period ? `${period.label} · ${period.status}` : "Loading reporting period";
  const reportHref = period ? `/api/report/${period.id}` : "#";

  async function handleSaveWells() {
    setWellsStatus("Saving wells...");
    try {
      const saved = await saveWells(wells);
      setWells(saved);
      setWellsStatus(`Saved ${saved.length} well${saved.length === 1 ? "" : "s"}`);
    } catch (error) {
      setWellsStatus(error instanceof Error ? error.message : "Unable to save wells");
    }
  }

  async function handleSaveRigs() {
    setRigsStatus("Saving rigs...");
    try {
      const saved = await saveRigs(rigs);
      setRigs(saved);
      setRigsStatus(`Saved ${saved.length} rig${saved.length === 1 ? "" : "s"}`);
    } catch (error) {
      setRigsStatus(error instanceof Error ? error.message : "Unable to save rigs");
    }
  }

  async function handleSaveJobTypes() {
    setJobTypesStatus("Saving job types...");
    try {
      const saved = await saveJobTypes(jobTypes);
      setJobTypes(saved);
      setJobTypesStatus(`Saved ${saved.length} job type${saved.length === 1 ? "" : "s"}`);
    } catch (error) {
      setJobTypesStatus(error instanceof Error ? error.message : "Unable to save job types");
    }
  }

  return (
    <AppShell active="admin">
      <AdminAccessGuard>
        <div className="topbar">
          <div>
            <div className="eyebrow">Admin review</div>
            <h1>Weekly report assembly</h1>
            <p>{periodLabel}</p>
          </div>
          <a className="button primary" href={reportHref}><Download size={17} /> Generate DOCX</a>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr><th>Department</th><th>Sections</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(({ module, saved }) => (
                <tr key={module.id}>
                  <td>{module.name}</td>
                  <td>{module.sections.length}</td>
                  <td><span className="pill">{saved ? saved.status : "Not started"}</span></td>
                  <td>
                    <a className="button ghost" href={`/modules/${module.id}`}><Eye size={16} /> Open</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-title">
          <h2>Reference data</h2>
        </div>
        <div className="grid">
          <ReferenceEditor
            title="Wells"
            description="Add, edit, or remove wells used by Engineering, Thermal, and other modules."
            status={wellsStatus}
            rows={wells}
            setRows={setWells}
            createRow={() => ({ id: "", well_name: "", lease: "", active: true })}
            onSave={handleSaveWells}
            columns={wellColumns}
          />

          <ReferenceEditor
            title="Rigs"
            description="Maintain the rig list used in drilling and engineering selections."
            status={rigsStatus}
            rows={rigs}
            setRows={setRigs}
            createRow={() => ({ id: "", name: "", active: true })}
            onSave={handleSaveRigs}
            columns={rigColumns}
          />

          <ReferenceEditor
            title="Job types"
            description="Maintain the job_type table used for Engineering type dropdowns."
            status={jobTypesStatus}
            rows={jobTypes}
            setRows={setJobTypes}
            createRow={() => ({ id: "", name: "", group_key: "engineering_well_jobs", active: true })}
            onSave={handleSaveJobTypes}
            columns={jobTypeColumns}
            note="Supported group keys in the current app are engineering_well_jobs and engineering_down_well_impact."
          />
        </div>

        <div className="section-title">
          <h2>Report controls</h2>
        </div>
        <div className="grid cards">
          <div className="card">
            <h3>Copy prior week</h3>
            <p>Every module supports a copy-forward action. In Supabase mode this reads the latest submitted entry for the same department and period predecessor.</p>
            <button className="button"><RefreshCw size={16} /> Prepare next cycle</button>
          </div>
          <div className="card">
            <h3>Template</h3>
            <p>The source report is stored at <code>templates/weekly-report-template.docx</code> and the generator preserves its section order.</p>
          </div>
        </div>
      </AdminAccessGuard>
    </AppShell>
  );
}

function ReferenceEditor<T extends { id: string; active: boolean | null }>({
  title,
  description,
  status,
  rows,
  setRows,
  createRow,
  onSave,
  columns,
  note
}: ReferenceEditorProps<T>) {
  const [expanded, setExpanded] = useState(true);

  function updateTextRow(index: number, key: keyof T, value: string) {
    setRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [key]: value } : row
    )));
  }

  function updateActiveRow(index: number, value: string) {
    setRows((current) => current.map((row, rowIndex) => (
      rowIndex === index ? { ...row, active: value === "true" } : row
    )));
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function addRow() {
    setRows((current) => [...current, createRow()]);
  }

  return (
    <section className="card reference-card">
      <div className="section-title">
        <div>
          <div className="eyebrow">Reference data</div>
          <h3>{title}</h3>
          <p>{description}</p>
          {note ? <p className="reference-note">{note}</p> : null}
        </div>
        <div className="section-actions">
          {expanded && <button className="button" onClick={addRow}><Plus size={16} /> Row</button>}
          {expanded && <button className="button primary" onClick={onSave}><Save size={16} /> Submit changes</button>}
          <button className="button ghost" onClick={() => setExpanded((value) => !value)}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      <div className="reference-toolbar">
        <span className="pill"><FileCog size={15} /> {status}</span>
      </div>

      {expanded ? (
        <div className="table-wrap">
          <table className="responsive-data-table">
            <thead>
              <tr>
                <th className="row-num">#</th>
                {columns.map((column) => <th key={String(column.key)}>{column.label}</th>)}
                <th className="row-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.id || `new-${rowIndex}`}>
                  <td className="row-num">{rowIndex + 1}</td>
                  {columns.map((column) => (
                    <td key={String(column.key)}>
                      {column.kind === "active" ? (
                        <select
                          value={row.active ? "true" : "false"}
                          onChange={(event) => updateActiveRow(rowIndex, event.target.value)}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={String(row[column.key] ?? "")}
                          placeholder={column.placeholder}
                          onChange={(event) => updateTextRow(rowIndex, column.key, event.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="row-actions">
                    <button className="icon-button" title="Delete row" onClick={() => removeRow(rowIndex)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <div className="empty-state">No rows yet. Add one and submit changes.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
