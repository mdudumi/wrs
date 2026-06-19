"use client";

import type { DepartmentEntryPayload } from "@/lib/types";

export function ImportedSourcePanel({ payload }: { payload: DepartmentEntryPayload | null }) {
  if (!payload) return null;
  const subsections = payload.subsections ?? [];
  const tables = payload.tables ?? [];

  return (
    <section className="card">
      <div className="section-title">
        <div>
          <div className="eyebrow">Imported SQL payload</div>
          <h2>Historical source data</h2>
          <p>{payload.source_file ?? "Seeded report"}{payload.report_label ? ` · ${payload.report_label}` : ""}</p>
        </div>
      </div>
      {subsections.length > 0 ? subsections.map((subsection) => (
        <div className="import-block" key={subsection.title}>
          <h3>{subsection.title}</h3>
          {(subsection.paragraphs ?? []).map((paragraph, index) => <p key={`${subsection.title}-${index}`}>{paragraph}</p>)}
          {(subsection.tables ?? []).map((table, index) => <SimpleTable key={`${subsection.title}-table-${index}`} rows={table.rows} />)}
        </div>
      )) : tables.map((table, index) => <SimpleTable key={`table-${index}`} rows={table.rows} />)}
    </section>
  );
}

function SimpleTable({ rows }: { rows: string[][] }) {
  if (!rows.length) return null;
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>{rows[0].map((cell, index) => <th key={index}>{cell || " "}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {rows[0].map((_, cellIndex) => <td key={cellIndex}>{row[cellIndex] ?? ""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
