export type FieldType = "text" | "memo" | "date" | "number" | "select";

export type FieldDefinition = {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  optionSet?: "wells" | "rigs" | "zones" | "pads" | "jobTypesWellJobs" | "jobTypesDownWellImpact";
  calculated?: string;
};

export type SectionDefinition = {
  id: string;
  name: string;
  kind: "narrative" | "table" | "metrics";
  fields: FieldDefinition[];
  totals?: string[];
  averages?: string[];
};

export type ModuleDefinition = {
  id: string;
  name: string;
  shortName: string;
  reportSection: string;
  summary: string;
  sections: SectionDefinition[];
};

export type DraftRow = Record<string, string>;
export type DraftData = Record<string, DraftRow[]>;

export type LegacyTable = {
  rows: string[][];
};

export type LegacySubsection = {
  title: string;
  paragraphs?: string[];
  tables?: LegacyTable[];
};

export type DepartmentEntryPayload = {
  formData?: DraftData;
  legacyImportedPayload?: {
    source_file?: string;
    report_label?: string;
    starts_on?: string;
    ends_on?: string;
    department_id?: string;
    paragraphs?: string[];
    tables?: LegacyTable[];
    subsections?: LegacySubsection[];
  };
  source_file?: string;
  report_label?: string;
  starts_on?: string;
  ends_on?: string;
  department_id?: string;
  paragraphs?: string[];
  tables?: LegacyTable[];
  subsections?: LegacySubsection[];
};

export type ReportingPeriodRecord = {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  status: string;
};

export type DepartmentEntryRecord = {
  id: string;
  period_id: string;
  department_id: string;
  status: "draft" | "submitted" | "approved" | "reopened";
  payload: DepartmentEntryPayload;
  updated_at: string;
};

export type WellReferenceRecord = {
  id: string;
  well_name: string;
  lease: string | null;
  active: boolean | null;
};

export type RigReferenceRecord = {
  id: string;
  name: string;
  active: boolean | null;
};

export type JobTypeReferenceRecord = {
  id: string;
  name: string;
  group_key: string | null;
  active: boolean | null;
};
