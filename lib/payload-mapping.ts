import type { DepartmentEntryPayload, DraftData, DraftRow, FieldDefinition, LegacySubsection, LegacyTable, ModuleDefinition, SectionDefinition } from "@/lib/types";

const SECTION_TITLE_ALIASES: Record<string, Record<string, string[]>> = {
  hsse: {
    incidents: ["INCIDENTS"],
    status: ["STATUS"],
    actions: ["ACTIONS"]
  },
  engineering: {
    wellJobs: ["POLYMER CONVERSION", "WATER FLOOD", "JET PUMP PROJECT", "REACTIV"],
    downWellImpact: ["DOWN WELL SITUATION AND PRODUCTION IMPACT"]
  },
  compliance: {
    pressureVessels: ["INSPECTION OF PRESSURE VESSEL AND HYDROCARBON TANKS"],
    inactiveWells: ["INACTIVE WELLS"],
    other: ["OTHERS", "OTHER"]
  },
  community: {
    communityInvestments: ["COMMUNITY INVESTMENTS"],
    grievances: ["IMPACT MITIGATION/GRIEVANCES"],
    other: ["OTHERS", "OTHER"]
  },
  geology: {
    projects: ["GEOLOGY AND DEVELOPMENT"],
    drillingUpdate: ["DEVELOPMENT DRILLING UPDATE"]
  },
  reservoir: {
    currentActivities: ["CURRENT ACTIVITIES"],
    productionBudget: ["PRODUCTION AGAINST BUDGET"],
    eorCycle: ["EOR PERFORMANCE (SATURDAY"],
    eorPerformance: ["EOR PERFORMANCE"],
    polymer: ["POLYMER"],
    other: ["OTHER"],
    newConversions: ["NEW CONVERSIONS"]
  },
  "well-services": {
    serviceTypes: ["WELL SERVICES", "DIFFERENT TYPE OF WELL SERVICES"]
  },
  facilities: {
    projects: ["FACILITIES"]
  },
  drilling: {
    completed: ["WELL COMPLETED"],
    current: ["CURRENT DRILLING OPERATION"],
    next: ["NEXT WELL PREPARATION"]
  },
  treating: {
    treating: ["TREATING"],
    facilityTreatment: ["M28D", "SLUDGE", "AGING OIL FACILITY TREATMENT"],
    mtdSales: ["MTD CRUDE SALES"],
    transportation: ["IN FIELD FLUID TRANSPORTATION"],
    gasFlotation: ["CTF GAS FLOTATION UNIT"],
    other: ["OTHER", "CHEMICAL", "WATER DISPOSAL"]
  },
  thermal: {
    thermalProduction: ["THERMAL"],
    steamInjection: ["THERMAL AVERAGE STEAM INJECTION"],
    operations: ["THERMAL OPERATIONS"],
    injectionBoiler: ["INJECTION", "BOILER"]
  }
};

const FIELD_ALIASES: Record<string, string[]> = {
  id: ["id"],
  description: ["brief description", "description"],
  incidentCode: ["incident code"],
  date: ["date"],
  unproratedProduction: ["unprorated production"],
  reportedProration: ["reported proration"],
  reportedProratedProduction: ["reported prorated production"],
  opsNightLoss: ["night shift report", "prod lost as per operations night shift report"],
  waterRoomLoss: ["water room"],
  well: ["well"],
  lease: ["lease"],
  type: ["type"],
  startDate: ["start date"],
  endDate: ["end date"],
  rig: ["rig", "rig name"],
  popDate: ["put on production", "put on injection", "put on production date"],
  comment: ["comment", "details", "current activity/issues", "current operations/ notes", "current operation"],
  beforeWoProduction: ["before wo"],
  afterWoProduction: ["after wo"],
  project: ["project"],
  subproject: ["subproject", "sub-project"],
  activity: ["current activity/issues"],
  position: ["previous", "current", "next"],
  wellName: ["wellname", "well name"],
  zone: ["zone"],
  depth: ["depth at report time", "current depth"],
  operations: ["brief description", "operations"],
  category: ["category"],
  weekBudget: ["budget"],
  weekActual: ["actual"],
  weekVariance: ["actual-budget", "variance"],
  ytdBudget: ["ytd budget", "cum production in ytd budget"],
  ytdActual: ["ytd actual", "cum production in ytd actual"],
  ytdVariance: ["ytd actual-budget"],
  area: ["area"],
  lastWeekOil: ["last week oil production"],
  thisWeekOil: ["this week oil production"],
  variance: ["variance"],
  conversionId: ["wells for conversion id"],
  injectionWell: ["injection well"],
  pad: ["pad"],
  mixingArea: ["mixing area"],
  firstInjectionDate: ["first injection date"],
  comments: ["comments"],
  item: ["item"],
  complete: ["% complete"],
  wellPadCellar: ["well/pad/cellar"],
  td: ["planned td", "planned td/ actual td", "planned td/ current depth"],
  currentOperation: ["current operation"],
  sra: ["sras/site preparation"],
  afe: ["afe"],
  programGeoDirectional: ["geo/ directional", "program"],
  drillingProgram: ["drlg program", "program drlg program"],
  lastWeek: ["last week"],
  thisWeek: ["this week"],
  stream: ["stream", "in", "out"],
  substream: ["substream", "item"],
  ytd: ["ytd"],
  volume: ["volume", "volume m3"],
  bsw: ["bsw", "bsw (%)"],
  lastWeekVolume: ["last week volume"],
  thisWeekVolume: ["this week volume"],
  lastWeekWaterCut: ["last week water cut"],
  thisWeekWaterCut: ["this week water cut"],
  inletoiw: ["inlet oiw"],
  outletoiw: ["outlet oiw"],
  inlettss: ["inlet tss"],
  outlettss: ["outlet tss"],
  g31aoiw: ["g31a oiw"],
  g31atss: ["g31a tss"],
  i28aoiw: ["i28a oiw"],
  i28atss: ["i28a tss"],
  facility: ["facility"],
  gross: ["gross (m3)", "gross"],
  netOil: ["net oil (m3)", "net oil"],
  loading: ["loading (m3)", "loading"],
  chemical: ["chemical in tbg/csg"],
  rate: ["rate"],
  pressure: ["pressure"],
  temp: ["temp"],
  dryness: ["dryness"],
  totalSteamInjection: ["total steam injection"]
};

export function createEmptyDraft(module: ModuleDefinition): DraftData {
  return Object.fromEntries(module.sections.map((section) => [section.id, [emptyRow(section)]]));
}

export function draftFromPayload(module: ModuleDefinition, payload?: DepartmentEntryPayload | null) {
  const empty = createEmptyDraft(module);
  if (!payload) return { draft: empty, importedPayload: null as DepartmentEntryPayload | null };

  if (payload.formData) {
    return { draft: normalizeDraftData(module, payload.formData), importedPayload: payload.legacyImportedPayload ?? null };
  }

  const importedPayload = payload.legacyImportedPayload ?? payload;
  const parsed = parseLegacyPayload(module, importedPayload);
  return { draft: parsed, importedPayload };
}

export function buildStoredPayload(module: ModuleDefinition, draft: DraftData, importedPayload?: DepartmentEntryPayload | null): DepartmentEntryPayload {
  return {
    formData: normalizeDraftData(module, draft),
    legacyImportedPayload: importedPayload ? {
      source_file: importedPayload.source_file,
      report_label: importedPayload.report_label,
      starts_on: importedPayload.starts_on,
      ends_on: importedPayload.ends_on,
      department_id: importedPayload.department_id,
      paragraphs: importedPayload.paragraphs,
      tables: importedPayload.tables,
      subsections: importedPayload.subsections
    } : undefined
  };
}

function normalizeDraftData(module: ModuleDefinition, formData: DraftData): DraftData {
  return Object.fromEntries(module.sections.map((section) => {
    const rows = (formData[section.id] ?? []).filter((row) => Object.values(row).some((value) => `${value}`.trim() !== ""));
    return [section.id, rows.length ? rows : [emptyRow(section)]];
  }));
}

function parseLegacyPayload(module: ModuleDefinition, payload: DepartmentEntryPayload): DraftData {
  if (module.id === "production") return parseProduction(module, payload);
  if (module.id === "thermal") return parseThermal(module, payload);

  const draft = createEmptyDraft(module);
  const subsections = payload.subsections ?? [];
  const aliases = SECTION_TITLE_ALIASES[module.id] ?? {};

  for (const section of module.sections) {
    const matchingTitles = aliases[section.id] ?? [section.name];
    const relatedSubsections = subsections.filter((subsection) => matchingTitles.some((alias) => normalized(subsection.title).includes(normalized(alias)) || normalized(alias).includes(normalized(subsection.title))));
    const relatedTables = relatedSubsections.flatMap((subsection) => subsection.tables ?? []);

    if (relatedTables.length) {
      const rows = relatedTables.flatMap((table) => mapTableToRows(section, table));
      if (rows.length) draft[section.id] = rows;
    }
  }

  if (module.id === "hsse" || module.id === "compliance" || module.id === "community" || module.id === "drilling") {
    return normalizeDraftData(module, draft);
  }

  const topLevelTables = payload.tables ?? [];
  module.sections.forEach((section, index) => {
    if (!hasMeaningfulRows(draft[section.id]) && topLevelTables[index]) {
      const rows = mapTableToRows(section, topLevelTables[index]);
      if (rows.length) draft[section.id] = rows;
    }
  });

  return normalizeDraftData(module, draft);
}

function parseProduction(module: ModuleDefinition, payload: DepartmentEntryPayload): DraftData {
  const draft = createEmptyDraft(module);
  const table = (payload.tables ?? [])[0];
  if (!table?.rows?.length) return draft;

  let target: "currentWeek" | "lastWeek" | null = null;
  let headers: string[] = [];
  const currentRows: DraftRow[] = [];
  const lastRows: DraftRow[] = [];

  for (const row of table.rows) {
    const first = normalized(row[0] ?? "");
    if (first === "currentweek") {
      target = "currentWeek";
      headers = row;
      continue;
    }
    if (first === "lastweek") {
      target = "lastWeek";
      headers = row;
      continue;
    }
    if (!target || !headers.length) continue;
    if (/average|total/.test(first)) continue;
    const targetSection = module.sections.find((section) => section.id === target);
    if (!targetSection) continue;
    const mapped = mapDataRow(targetSection, headers, row);
    if (Object.values(mapped).some(Boolean)) {
      (target === "currentWeek" ? currentRows : lastRows).push(mapped);
    }
  }

  draft.currentWeek = currentRows.length ? currentRows : [emptyRow(module.sections[0])];
  draft.lastWeek = lastRows.length ? lastRows : [emptyRow(module.sections[1])];
  return draft;
}

function parseThermal(module: ModuleDefinition, payload: DepartmentEntryPayload): DraftData {
  const draft = createEmptyDraft(module);
  const table = (payload.tables ?? [])[0];
  if (!table?.rows?.length) return draft;

  const productionSection = module.sections.find((section) => section.id === "thermalProduction");
  const steamSection = module.sections.find((section) => section.id === "steamInjection");
  if (!productionSection || !steamSection) return draft;

  let mode: "production" | "steam" | null = null;
  let headers: string[] = [];
  const productionRows: DraftRow[] = [];
  const steamRows: DraftRow[] = [];

  for (const row of table.rows) {
    const first = normalized(row[0] ?? "");
    if (first === "well" && !mode) {
      mode = "production";
      headers = row;
      continue;
    }
    if (first.includes("weeklydataonthermalaveragesteaminjection")) {
      mode = "steam";
      headers = [];
      continue;
    }
    if (mode === "steam" && first === "well") {
      headers = row;
      continue;
    }
    if (!mode || !headers.length) continue;
    if (first === "total") continue;
    const section = mode === "production" ? productionSection : steamSection;
    const mapped = mapDataRow(section, headers, row);
    if (Object.values(mapped).some(Boolean)) {
      (mode === "production" ? productionRows : steamRows).push(mapped);
    }
  }

  draft.thermalProduction = productionRows.length ? productionRows : [emptyRow(productionSection)];
  draft.steamInjection = steamRows.length ? steamRows : [emptyRow(steamSection)];

  const operationsTable = (payload.tables ?? [])[1];
  if (operationsTable?.rows?.length) {
    const opsSection = module.sections.find((section) => section.id === "operations");
    if (opsSection) {
      draft.operations = operationsTable.rows.slice(1).map((row, index) => ({
        id: `${index + 1}`,
        description: row.join(" ").trim()
      })).filter((row) => row.description) || [emptyRow(opsSection)];
    }
  }

  return normalizeDraftData(module, draft);
}

function mapTableToRows(section: SectionDefinition, table: LegacyTable): DraftRow[] {
  if (!table.rows.length) return [];
  const headers = table.rows[0];
  return table.rows.slice(1)
    .map((row) => mapDataRow(section, headers, row))
    .filter((mapped) => Object.values(mapped).some((value) => `${value}`.trim() !== ""));
}

function mapDataRow(section: SectionDefinition, headers: string[], row: string[]): DraftRow {
  const headerIndexes = section.fields.map((field) => findHeaderIndex(field, headers));
  const mapped = emptyRow(section);

  section.fields.forEach((field, index) => {
    const headerIndex = headerIndexes[index];
    const fallbackIndex = headerIndex >= 0 ? headerIndex : index < row.length ? index : -1;
    const raw = fallbackIndex >= 0 ? row[fallbackIndex] ?? "" : "";
    mapped[field.id] = cleanValue(field, raw);
  });

  return mapped;
}

function findHeaderIndex(field: FieldDefinition, headers: string[]) {
  const normalizedHeaders = headers.map((header) => normalized(header));
  const aliases = [field.label, ...(FIELD_ALIASES[field.id] ?? [])].map(normalized);
  return normalizedHeaders.findIndex((header) => aliases.some((alias) => header.includes(alias) || alias.includes(header)));
}

function cleanValue(field: FieldDefinition, raw: string) {
  const value = `${raw ?? ""}`.trim();
  if (!value || value === "-") return "";
  if (field.type === "date") {
    const parsed = parseDate(value);
    return parsed ?? value;
  }
  if (field.type === "number") {
    return value.replace(/[^0-9.\-]/g, "");
  }
  return value;
}

function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const month = slash[1].padStart(2, "0");
    const day = slash[2].padStart(2, "0");
    return `${slash[3]}-${month}-${day}`;
  }
  const dot = value.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dot) return `${dot[1]}-${dot[2]}-${dot[3]}`;
  const dash = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (dash) {
    const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const year = dash[3].length === 2 ? `20${dash[3]}` : dash[3];
    return `${year}-${months[dash[2].toLowerCase()] ?? "01"}-${dash[1].padStart(2, "0")}`;
  }
  return null;
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasMeaningfulRows(rows: DraftRow[]) {
  return rows.some((row) => Object.values(row).some((value) => `${value}`.trim() !== ""));
}

function emptyRow(section: SectionDefinition): DraftRow {
  return Object.fromEntries(section.fields.map((field) => [field.id, ""]));
}
