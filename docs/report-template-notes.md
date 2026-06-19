# Report Template Notes

The original report file supplied by the user is copied to:

`templates/weekly-report-template.docx`

The application uses that document as the canonical section order for generated weekly management reports:

1. HSSE
2. Production
3. Engineering and Technical
4. Compliance and Permitting
5. Community Relations
6. Geology and Development
7. Development & Reservoir Engineering
8. Well Services
9. Facilities
10. Drilling
11. Treating and Operations
12. Thermal Operations

For production hardening, replace the placeholder generator in `lib/report/build-weekly-report.ts` with a DOCX templating pass that injects submitted `department_entries.payload` values into cloned table structures from the source report.
