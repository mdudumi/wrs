from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Spacer,
    Paragraph,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)


ROOT = Path("C:/WRS")
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUTPUT_DIR / "weekly-report-user-manual.pdf"


ACCENT = colors.HexColor("#7A1F2B")
ACCENT_DARK = colors.HexColor("#4E121B")
PANEL = colors.HexColor("#F5F5F7")
PANEL_ALT = colors.HexColor("#ECEDEF")
LINE = colors.HexColor("#D2D6DC")
INK = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#667085")
POS = colors.HexColor("#E3F1E5")
NEG = colors.HexColor("#F8E3E7")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="ManualTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=26,
        leading=30,
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="ManualSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.white,
        alignment=TA_CENTER,
        spaceAfter=0,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=ACCENT_DARK,
        spaceBefore=8,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="SubHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=INK,
        spaceBefore=8,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="ManualBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.4,
        leading=15,
        textColor=INK,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        name="ManualBullet",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.2,
        leading=14,
        textColor=INK,
        leftIndent=14,
        firstLineIndent=-8,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallMuted",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=MUTED,
        spaceAfter=4,
    )
)


def p(text, style="ManualBody"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph(f"• {text}", styles["ManualBullet"])


def small(text):
    return Paragraph(text, styles["SmallMuted"])


def section_title(text):
    return Paragraph(text, styles["SectionHeading"])


def sub_title(text):
    return Paragraph(text, styles["SubHeading"])


def info_table(rows, col_widths, header_fill=PANEL_ALT):
    table = Table(rows, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), header_fill),
                ("TEXTCOLOR", (0, 0), (-1, 0), INK),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("LEADING", (0, 0), (-1, -1), 12),
                ("GRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def cover_block():
    title = Table(
        [[
            Paragraph("Weekly Report User Manual", styles["ManualTitle"]),
            Paragraph(
                "Patos-Marinza operations reporting system<br/>User guide for department users and administrators",
                styles["ManualSubtitle"],
            ),
        ]],
        colWidths=[170 * mm],
    )
    title.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), ACCENT_DARK),
                ("LEFTPADDING", (0, 0), (-1, -1), 16),
                ("RIGHTPADDING", (0, 0), (-1, -1), 16),
                ("TOPPADDING", (0, 0), (-1, -1), 28),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 28),
                ("BOX", (0, 0), (-1, -1), 0, colors.white),
            ]
        )
    )
    return title


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(doc.leftMargin, 14 * mm, A4[0] - doc.rightMargin, 14 * mm)
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, 9 * mm, "Weekly Report User Manual")
    canvas.drawRightString(A4[0] - doc.rightMargin, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


story = []
story.append(Spacer(1, 28 * mm))
story.append(cover_block())
story.append(Spacer(1, 10 * mm))
story.append(
    info_table(
        [
            ["Manual version", "Prepared for", "Application"],
            ["1.0", "Operations, department users, and admin reviewers", "Weekly Operations Report SaaS"],
        ],
        [45 * mm, 70 * mm, 55 * mm],
        header_fill=PANEL,
    )
)
story.append(Spacer(1, 8 * mm))
story.append(
    p(
        "This manual explains how to log in, choose the reporting week, enter department updates, copy data from prior weeks, submit entries, review reports as an administrator, manage reference tables, and prepare the final DOCX output."
    )
)
story.append(PageBreak())

story.append(section_title("1. What The System Does"))
story.extend(
    [
        p("The Weekly Report system is a Supabase-backed reporting application used to collect weekly operational updates from multiple departments and assemble them into the final Patos-Marinza management report."),
        bullet("Department users can open only their assigned department and submit that department’s weekly data."),
        bullet("Admin users can open all departments, create the next reporting week, manage reference data, review submissions, and generate the final DOCX report."),
        bullet("Each module supports structured table entry, draft saving, submission, prior-week copy, and period-based reporting."),
        bullet("The final management report is generated from the stored weekly entries, not typed manually in Word."),
    ]
)

story.append(section_title("2. Roles And Access"))
story.append(sub_title("2.1 Department user"))
story.extend(
    [
        bullet("Can sign in with a real account linked to a row in user_profiles."),
        bullet("Must also have one or more department_memberships rows."),
        bullet("Can see only the assigned department module or modules."),
        bullet("Can create, edit, save, and submit data only for the selected week."),
    ]
)
story.append(sub_title("2.2 Admin user"))
story.extend(
    [
        bullet("Admin access is controlled by user_profiles.role = admin."),
        bullet("Can access every department module."),
        bullet("Can open Admin Review."),
        bullet("Can generate the DOCX report."),
        bullet("Can create the next reporting week."),
        bullet("Can manage reference data such as wells, rigs, and job_type directly from the app."),
    ]
)

story.append(section_title("3. Sign-In Process"))
story.extend(
    [
        p("Open the application login page and sign in with the same email and password used in Supabase Auth."),
        bullet("Email must belong to an existing authenticated account."),
        bullet("The account must match a row in user_profiles."),
        bullet("Department users must also have department_memberships rows."),
        bullet("If the login screen shows ‘Supabase credentials are not configured’, the environment variables are missing from the active deployment or server session."),
    ]
)
story.append(
    info_table(
        [
            ["Common login message", "Meaning", "Action"],
            ["No active session", "User is not signed in", "Sign in again with the correct password"],
            ["No matching user_profiles row", "Auth account exists but profile record is missing", "Create the profile in Supabase"],
            ["This department user has no department_membership rows", "User exists but has no linked department", "Insert membership rows for that user"],
            ["Supabase credentials are not configured", "Deployment or local server is missing env vars", "Set env vars and redeploy or restart"],
        ],
        [50 * mm, 60 * mm, 60 * mm],
    )
)

story.append(PageBreak())

story.append(section_title("4. Selecting The Reporting Week"))
story.extend(
    [
        p("The left sidebar contains the Weekly Report selector. Every entry and every generated report is tied to the currently selected reporting week."),
        bullet("Choose the required week from the dropdown before entering data."),
        bullet("Changing the selected week changes the data loaded across modules."),
        bullet("Admin users can create a new week by using the Create next week button in the period selector."),
    ]
)
story.append(sub_title("4.1 How weeks work"))
story.extend(
    [
        bullet("Each reporting period has a label, start date, end date, and status."),
        bullet("The most recently selected period is stored locally in the browser."),
        bullet("Modules and Admin Review refresh their data when the selected period changes."),
    ]
)

story.append(section_title("5. Dashboard And Navigation"))
story.extend(
    [
        p("After sign-in, the user lands on the dashboard."),
        bullet("Department users see only the modules assigned to them."),
        bullet("Admin users see all modules plus the Admin Review page."),
        bullet("Each module card opens the form for that department."),
        bullet("The dashboard shows a high-level count of visible modules and report weeks."),
    ]
)

story.append(section_title("6. Entering Data In A Department Module"))
story.extend(
    [
        p("Each department module is divided into sections. Sections can be expanded or collapsed. Structured data is entered in table form."),
        bullet("Use New entry or Edit current week to start working on the selected period."),
        bullet("If an entry already exists for the selected week, the module loads that entry for editing."),
        bullet("Use Row to add a new record in the current section."),
        bullet("Use the delete icon to remove a row."),
        bullet("Use Save draft to keep work in progress without final submission."),
        bullet("Use Submit when the department data is ready for admin review."),
    ]
)
story.append(sub_title("6.1 Copy prior week / paste into current week"))
story.extend(
    [
        bullet("Select a source week in the Copy from week dropdown."),
        bullet("Choose Copy selected week to capture the source data."),
        bullet("Choose Paste to current week to place that data into the current draft."),
        bullet("Save draft after pasting if you want to keep the copied content."),
    ]
)

story.append(sub_title("6.2 Calculated fields"))
story.extend(
    [
        bullet("Some variance fields are calculated automatically and are read-only."),
        bullet("Positive variance is highlighted in green."),
        bullet("Negative variance is highlighted in light red."),
        bullet("Neutral or zero variance uses a neutral background."),
    ]
)

story.append(PageBreak())

story.append(section_title("7. Module Guide"))
story.append(
    info_table(
        [
            ["Module", "Typical content", "Notes"],
            ["HSSE", "Incidents, status, actions", "Supports structured tables and DOCX export"],
            ["Production", "Current week, last week, production comparison", "Includes charts and current/last week comparison"],
            ["Engineering and Technical", "Well jobs, down well impact", "Dropdowns pull from wells, rigs, and job_type reference tables"],
            ["Compliance", "Pressure vessels, inactive wells, other", "Tabular brief descriptions"],
            ["Community Relations", "Community investments, grievances, other", "Table-based module"],
            ["Geology and Development", "Project updates, drilling update", "Supports project/subproject/activity structure"],
            ["Development & Reservoir Engineering", "Budget, EOR, polymer, conversions", "Includes auto variance calculations"],
            ["Well Services", "Type, item, comment", "Rendered as a structured 3-column table in the report"],
            ["Facilities", "Project and activity tracking", "Project progress and issues"],
            ["Drilling", "Completed wells, current operation, next well prep", "Rig-driven tables"],
            ["Treating and Operations", "Treating, facility treatment, transportation, flotation, other", "Includes treating variance logic and facility substream field"],
            ["Thermal Operations", "Thermal production, steam injection, operations, boiler", "Totals render below the main thermal tables"],
        ],
        [41 * mm, 76 * mm, 53 * mm],
    )
)

story.append(section_title("8. Admin Review"))
story.extend(
    [
        p("Admin Review is the control center for the reporting cycle."),
        bullet("Shows every department and its status for the selected week."),
        bullet("Lets the admin open any module directly."),
        bullet("Provides the Generate DOCX action for the final report."),
        bullet("Includes reference-data editors for wells, rigs, and job_type."),
    ]
)
story.append(sub_title("8.1 Reference data editor"))
story.extend(
    [
        bullet("The Wells editor manages well_name, lease, and active status."),
        bullet("The Rigs editor manages rig name and active status."),
        bullet("The Job types editor manages name, group_key, and active status."),
        bullet("Each editor supports Add row, Delete row, Expand/Collapse, and Submit changes."),
        bullet("Only admins can save these changes."),
    ]
)
story.append(
    info_table(
        [
            ["Reference table", "Used by", "Key fields"],
            ["wells", "Engineering, Geology, Thermal, and other module dropdowns", "well_name, lease, active"],
            ["rigs", "Engineering and Drilling dropdowns", "name, active"],
            ["job_type", "Engineering type selectors", "name, group_key, active"],
        ],
        [40 * mm, 70 * mm, 60 * mm],
    )
)

story.append(section_title("9. Generating The Final Report"))
story.extend(
    [
        p("The final management report is generated from the selected reporting week in Admin Review."),
        bullet("Open Admin Review."),
        bullet("Confirm the selected week in the sidebar."),
        bullet("Review the department statuses."),
        bullet("Click Generate DOCX."),
        bullet("The system produces the report in the existing management-report structure."),
    ]
)
story.append(sub_title("9.1 Report behavior"))
story.extend(
    [
        bullet("Module sections are rendered in report order."),
        bullet("Structured sections appear as clean tables instead of repeated card-style labels."),
        bullet("Variance cells use the same positive/negative color logic used in the app."),
        bullet("Totals appear below specific tables where configured, such as thermal and selected reservoir sections."),
        bullet("The report is designed for DOCX export and management review, not direct browser printing."),
    ]
)

story.append(PageBreak())

story.append(section_title("10. Deployment And Environment Variables"))
story.extend(
    [
        p("The system can run locally or in a hosted deployment such as Netlify. In either case, the required Supabase variables must be configured."),
    ]
)
story.append(
    info_table(
        [
            ["Variable", "Purpose", "Required where"],
            ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL", "Local and hosted"],
            ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Client-side sign-in and reads", "Local and hosted"],
            ["SUPABASE_SERVICE_ROLE_KEY", "Server-side report and admin operations", "Local and hosted server"],
        ],
        [58 * mm, 62 * mm, 50 * mm],
    )
)
story.extend(
    [
        bullet("Local development reads these values from .env.local."),
        bullet("Hosted deployments do not read your local .env.local file automatically."),
        bullet("On Netlify, add these values under Site configuration -> Environment variables."),
        bullet("After changing hosted environment variables, trigger a new deploy."),
    ]
)

story.append(section_title("11. Troubleshooting"))
troubleshooting_rows = [
    ["Problem", "Likely cause", "Recommended action"],
    ["Login works locally but not on deployment", "Hosted env vars missing", "Set env vars in the hosting platform and redeploy"],
    ["Department user can sign in but sees an access warning", "No department_memberships rows", "Insert the department membership in Supabase"],
    ["Admin reference-data save returns 401", "Expired browser session or old client bundle", "Sign in again and reload the page"],
    ["Generated report shows no data", "Wrong reporting week selected or module not submitted", "Check the selected week and entry status in Admin Review"],
    ["GitHub push fails with large file error", "node_modules or .next committed", "Ignore generated folders and amend the commit before pushing"],
]
story.append(info_table(troubleshooting_rows, [48 * mm, 58 * mm, 64 * mm]))

story.append(section_title("12. Recommended Weekly Operating Routine"))
story.extend(
    [
        bullet("Admin creates the next reporting week."),
        bullet("Department users choose the correct week and create or edit their entry."),
        bullet("Users copy useful data from a prior week when needed."),
        bullet("Users save drafts while working."),
        bullet("Users submit final department entries."),
        bullet("Admin reviews the statuses and opens any department that needs correction."),
        bullet("Admin updates wells, rigs, or job types if the operational reference data has changed."),
        bullet("Admin generates the final DOCX report."),
    ]
)

story.append(Spacer(1, 8 * mm))
story.append(
    KeepTogether(
        [
            Table(
                [[Paragraph("End of manual", styles["ManualSubtitle"])]],
                colWidths=[170 * mm],
                hAlign="LEFT",
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), ACCENT),
                        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                        ("LEFTPADDING", (0, 0), (-1, -1), 12),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ]
                ),
            ),
            Spacer(1, 4 * mm),
            small("Prepared from the current Weekly Operations Report SaaS implementation in C:/WRS."),
        ]
    )
)


doc = SimpleDocTemplate(
    str(PDF_PATH),
    pagesize=A4,
    leftMargin=18 * mm,
    rightMargin=18 * mm,
    topMargin=18 * mm,
    bottomMargin=18 * mm,
    title="Weekly Report User Manual",
    author="OpenAI Codex",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(PDF_PATH)
