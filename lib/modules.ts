import type { FieldDefinition, ModuleDefinition } from "@/lib/types";

const idText: FieldDefinition[] = [
  { id: "id", label: "ID", type: "number" },
  { id: "description", label: "Brief Description", type: "memo" }
];

const productionFields: FieldDefinition[] = [
  { id: "date", label: "Date", type: "date" },
  { id: "unproratedProduction", label: "Unprorated Production", type: "number" },
  { id: "reportedProration", label: "Reported Proration", type: "number" },
  { id: "reportedProratedProduction", label: "Reported Prorated Production", type: "number" },
  { id: "opsNightLoss", label: "Prod Lost Ops Night Shift", type: "number" },
  { id: "waterRoomLoss", label: "Prod Lost Water Room", type: "number" }
];

export const modules: ModuleDefinition[] = [
  {
    id: "hsse",
    name: "HSSE",
    shortName: "HSSE",
    reportSection: "HSSE",
    summary: "Incidents, status items, and actions with prior-week review.",
    sections: [
      { id: "incidents", name: "Incidents", kind: "table", fields: [{ id: "incidentCode", label: "Incident Code", type: "text" }, { id: "date", label: "Date", type: "date" }, { id: "description", label: "Brief Description", type: "memo" }] },
      { id: "status", name: "Status", kind: "table", fields: idText },
      { id: "actions", name: "Actions", kind: "table", fields: idText }
    ]
  },
  {
    id: "production",
    name: "Production",
    shortName: "Production",
    reportSection: "PRODUCTION",
    summary: "Current week entry, previous week carry-forward, totals, averages, and bbl conversion.",
    sections: [
      { id: "currentWeek", name: "Current Week", kind: "metrics", fields: productionFields, totals: ["unproratedProduction", "reportedProratedProduction", "opsNightLoss"], averages: ["unproratedProduction", "reportedProratedProduction", "opsNightLoss"] },
      { id: "lastWeek", name: "Last Week", kind: "metrics", fields: productionFields, totals: ["unproratedProduction", "reportedProratedProduction", "opsNightLoss"], averages: ["unproratedProduction", "reportedProratedProduction", "opsNightLoss"] }
    ]
  },
  {
    id: "engineering",
    name: "Engineering and Technical",
    shortName: "Engineering",
    reportSection: "ENGINEERING AND TECHNICAL",
    summary: "Well jobs by type and down-well production impact.",
    sections: [
      { id: "wellJobs", name: "Well Jobs", kind: "table", fields: [
        { id: "well", label: "Well", type: "select", optionSet: "wells" },
        { id: "lease", label: "Lease", type: "text" },
        { id: "type", label: "Type", type: "select", optionSet: "jobTypesWellJobs" },
        { id: "startDate", label: "Start Date", type: "date" },
        { id: "endDate", label: "End Date", type: "date" },
        { id: "rig", label: "Rig", type: "select", optionSet: "rigs" },
        { id: "popDate", label: "Put on Production Date", type: "date" },
        { id: "comment", label: "Comment", type: "memo" }
      ] },
      { id: "downWellImpact", name: "Down Well Situation and Production Impact", kind: "table", totals: ["beforeWoProduction", "afterWoProduction"], fields: [
        { id: "well", label: "Well", type: "select", optionSet: "wells" },
        { id: "lease", label: "Lease", type: "text" },
        { id: "type", label: "Type", type: "select", optionSet: "jobTypesDownWellImpact" },
        { id: "beforeWoProduction", label: "Before WO Production", type: "number" },
        { id: "afterWoProduction", label: "After WO Production", type: "number" },
        { id: "popDate", label: "Put on Production Date", type: "date" },
        { id: "comment", label: "Comment", type: "memo" }
      ] }
    ]
  },
  {
    id: "compliance",
    name: "Compliance and Permitting",
    shortName: "Compliance",
    reportSection: "COMPLIANCE AND PERMITTING",
    summary: "Pressure vessel inspections, inactive wells, and other compliance notes.",
    sections: [
      { id: "pressureVessels", name: "Inspection of Pressure Vessel and Hydrocarbon Tanks", kind: "table", fields: idText },
      { id: "inactiveWells", name: "Inactive Wells", kind: "table", fields: idText },
      { id: "other", name: "Other", kind: "table", fields: idText }
    ]
  },
  {
    id: "community",
    name: "Community Relations",
    shortName: "Community",
    reportSection: "COMMUNITY RELATIONS",
    summary: "Community investments, grievances, mitigation, and other items.",
    sections: [
      { id: "communityInvestments", name: "Community Investments", kind: "table", fields: idText },
      { id: "grievances", name: "Impact Mitigation / Grievances", kind: "table", fields: idText },
      { id: "other", name: "Other", kind: "table", fields: idText }
    ]
  },
  {
    id: "geology",
    name: "Geology and Development",
    shortName: "Geology",
    reportSection: "GEOLOGY AND DEVELOPMENT",
    summary: "Project activity and development drilling updates.",
    sections: [
      { id: "projects", name: "Project Updates", kind: "table", fields: [{ id: "project", label: "Project", type: "text" }, { id: "subproject", label: "Subproject", type: "text" }, { id: "activity", label: "Current Activity / Issues", type: "memo" }] },
      { id: "drillingUpdate", name: "Development Drilling Update", kind: "table", fields: [
        { id: "position", label: "Previous / Current / Next", type: "select", options: ["Previous Well", "Current Well", "Next Well"] },
        { id: "wellName", label: "Well Name", type: "select", optionSet: "wells" },
        { id: "zone", label: "Zone", type: "select", optionSet: "zones" },
        { id: "depth", label: "Depth at Report Time", type: "number" },
        { id: "operations", label: "Current Operations / Notes", type: "memo" }
      ] }
    ]
  },
  {
    id: "reservoir",
    name: "Reservoir",
    shortName: "Reservoir",
    reportSection: "RESERVOIR",
    summary: "Current activities, production against budget, and EOR production performance.",
    sections: [
      { id: "currentActivities", name: "Current Activities", kind: "table", fields: idText },
      { id: "productionBudget", name: "Production Against Budget", kind: "metrics", fields: [
        { id: "category", label: "Category", type: "select", options: ["Existing well", "New non-thermal well", "Polymer Conversion", "Reactivation+Stimulation", "Thermal", "Total"] },
        { id: "weekBudget", label: "Average This Week Budget", type: "number" },
        { id: "weekActual", label: "Average This Week Actual", type: "number" },
        { id: "weekVariance", label: "Actual-Budget", type: "number", calculated: "weekActual-weekBudget" },
        { id: "ytdBudget", label: "YTD Budget", type: "number" },
        { id: "ytdActual", label: "YTD Actual", type: "number" },
        { id: "ytdVariance", label: "YTD Actual-Budget", type: "number", calculated: "ytdActual-ytdBudget" }
      ] },
      { id: "eorCycle", name: "EOR Performance Saturday-Saturday", kind: "metrics", fields: [
        { id: "area", label: "Area", type: "select", options: ["Central PF&WF", "North PF", "South PF", "Total"] },
        { id: "lastWeekOil", label: "Last Week Oil Production m3/d", type: "number" },
        { id: "thisWeekOil", label: "This Week Oil Production m3/d", type: "number" },
        { id: "variance", label: "Variance +/- m3/d", type: "number", calculated: "thisWeekOil-lastWeekOil" }
      ] },
      { id: "eorPerformance", name: "EOR Performance", kind: "table", fields: idText }
    ]
  },
  {
    id: "eor",
    name: "EOR",
    shortName: "EOR",
    reportSection: "EOR",
    summary: "Polymer, other EOR notes, and new conversions.",
    sections: [
      { id: "polymer", name: "Polymer", kind: "table", fields: idText },
      { id: "other", name: "Other", kind: "table", fields: idText },
      { id: "newConversions", name: "New Conversions", kind: "table", fields: [
        { id: "conversionId", label: "Wells for Conversion ID", type: "text" },
        { id: "injectionWell", label: "Injection Well", type: "select", optionSet: "wells" },
        { id: "pad", label: "Pad", type: "select", optionSet: "pads" },
        { id: "mixingArea", label: "Mixing Area", type: "text" },
        { id: "firstInjectionDate", label: "First Injection Date", type: "date" },
        { id: "comments", label: "Comments", type: "memo" }
      ] }
    ]
  },
  {
    id: "well-services",
    name: "Well Services",
    shortName: "Well Services",
    reportSection: "WELL SERVICES",
    summary: "Well service entries differentiated by service type.",
    sections: [
      { id: "serviceTypes", name: "Different Types of Well Services", kind: "table", fields: [
        { id: "type", label: "Type", type: "select", options: ["Summary", "Injection Well", "Reactivation", "New Completion", "Workovers", "Minor Workovers", "Flush By", "Rigless", "DH Equipment Urgently Required"] },
        { id: "item", label: "Item", type: "text" },
        { id: "comment", label: "Comment", type: "memo" }
      ] }
    ]
  },
  {
    id: "facilities",
    name: "Facilities",
    shortName: "Facilities",
    reportSection: "FACILITIES",
    summary: "Project completion and activity/issues tracking.",
    sections: [
      { id: "projects", name: "Facilities Projects", kind: "table", fields: [{ id: "project", label: "Project", type: "text" }, { id: "complete", label: "% Complete", type: "number" }, { id: "activity", label: "Current Activity / Issues", type: "memo" }] }
    ]
  },
  {
    id: "drilling",
    name: "Drilling",
    shortName: "Drilling",
    reportSection: "DRILLING",
    summary: "Completed wells, current operations, and next well preparation.",
    sections: [
      { id: "completed", name: "Well Completed", kind: "table", fields: [{ id: "rigName", label: "Rig Name", type: "select", optionSet: "rigs" }, { id: "wellPadCellar", label: "Well / Pad / Cellar", type: "text" }, { id: "td", label: "Planned TD / Actual TD", type: "text" }, { id: "details", label: "Details", type: "memo" }] },
      { id: "current", name: "Current Drilling Operation", kind: "table", fields: [{ id: "rigName", label: "Rig Name", type: "select", optionSet: "rigs" }, { id: "wellPadCellar", label: "Well / Pad / Cellar", type: "text" }, { id: "td", label: "Planned TD / Actual TD", type: "text" }, { id: "currentOperation", label: "Current Operation", type: "memo" }] },
      { id: "next", name: "Next Well Preparation", kind: "table", fields: [{ id: "rigName", label: "Rig Name", type: "select", optionSet: "rigs" }, { id: "wellPadCellar", label: "Well / Pad / Cellar", type: "text" }, { id: "sra", label: "SRAs / Site Preparation", type: "text" }, { id: "afe", label: "AFE", type: "text" }, { id: "programGeoDirectional", label: "Program / Geo / Directional", type: "text" }, { id: "drillingProgram", label: "Program DRLG Program", type: "memo" }] }
    ]
  },
  {
    id: "treating",
    name: "Treating and Operations",
    shortName: "Treating",
    reportSection: "TREATING AND OPERATIONS",
    summary: "Treating, facility treatment, sales, transportation, gas flotation, and other operations.",
    sections: [
      { id: "treating", name: "Treating", kind: "metrics", fields: [{ id: "item", label: "Item", type: "text" }, { id: "lastWeek", label: "Last Week", type: "number" }, { id: "thisWeek", label: "This Week", type: "number" }, { id: "variance", label: "Variance", type: "number", calculated: "thisWeek-lastWeek" }] },
      { id: "facilityTreatment", name: "M28D, Sludge & Aging Oil Facility Treatment", kind: "metrics", fields: [{ id: "stream", label: "Stream", type: "select", options: ["M28-D IN", "M28-D OUT", "Sludge IN", "Sludge OUT", "Skim Fac. / Aging Oil SOAR IN", "Skim Fac. / Aging Oil SOAR OUT"] }, { id: "substream", label: "Substream", type: "text" }, { id: "ytd", label: "YTD", type: "number" }, { id: "thisWeek", label: "This Week", type: "number" }] },
      { id: "mtdSales", name: "MTD Crude Sales", kind: "metrics", fields: [{ id: "item", label: "Item", type: "text" }, { id: "volume", label: "Volume m3", type: "number" }, { id: "bsw", label: "BSW", type: "number" }] },
      { id: "transportation", name: "In Field Fluid Transportation", kind: "metrics", fields: [{ id: "item", label: "Item", type: "select", options: ["Average Daily Fluid Transportation", "Back Loads From Fier to Field m3", "Backloads From PIA to Field m3"] }, { id: "lastWeekVolume", label: "Last Week Volume", type: "number" }, { id: "thisWeekVolume", label: "This Week Volume", type: "number" }, { id: "lastWeekWaterCut", label: "Last Week Water Cut", type: "number" }, { id: "thisWeekWaterCut", label: "This Week Water Cut", type: "number" }] },
      { id: "gasFlotation", name: "CTF Gas Flotation Unit", kind: "metrics", fields: ["Inlet OIW", "Outlet OIW", "Inlet TSS", "Outlet TSS", "G31A OIW", "G31A TSS", "I28A OIW", "I28A TSS"].map((label) => ({ id: label.toLowerCase().replace(/\s+/g, ""), label, type: "number" as const })) },
      { id: "other", name: "Other", kind: "table", fields: [{ id: "type", label: "Type", type: "select", options: ["Other", "Water Disposal", "Chemical"] }, { id: "facility", label: "Facility", type: "text" }, { id: "description", label: "Brief Description", type: "memo" }] }
    ]
  },
  {
    id: "thermal",
    name: "Thermal Operations",
    shortName: "Thermal",
    reportSection: "THERMAL OPERATIONS",
    summary: "Thermal well production, steam injection, operations, injection, and boiler notes.",
    sections: [
      { id: "thermalProduction", name: "Thermal", kind: "metrics", totals: ["gross", "netOil", "loading"], averages: ["bsw"], fields: [{ id: "well", label: "Well", type: "select", optionSet: "wells" }, { id: "gross", label: "Gross m3", type: "number" }, { id: "netOil", label: "Net Oil m3", type: "number" }, { id: "bsw", label: "BSW %", type: "number" }, { id: "loading", label: "Loading m3", type: "number" }, { id: "chemical", label: "Chemical in tbg/csg litres", type: "number" }, { id: "comment", label: "Comment", type: "memo" }] },
      { id: "steamInjection", name: "Weekly Data on Thermal Average Steam Injection", kind: "metrics", totals: ["totalSteamInjection"], fields: [{ id: "well", label: "Well", type: "select", optionSet: "wells" }, { id: "rate", label: "Rate t/h", type: "number" }, { id: "pressure", label: "Pressure psi", type: "number" }, { id: "temp", label: "Temp", type: "number" }, { id: "dryness", label: "Dryness %", type: "number" }, { id: "totalSteamInjection", label: "Total Steam Injection m3", type: "number" }, { id: "comment", label: "Comment", type: "memo" }] },
      { id: "operations", name: "Thermal Operations", kind: "table", fields: idText },
      { id: "injectionBoiler", name: "Injection and Boiler", kind: "table", fields: idText }
    ]
  }
];
