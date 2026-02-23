export const mockPatient = {
  name: "Rahul Sharma",
  age: 45,
  gender: "M",
  abha: "12-3456-7890-1234",
  bloodGroup: "B+",
  hospital: "AIIMS New Delhi",
  ward: "General Medicine - Bed 14B",
  admission: "14 Feb 2026 09:30",
  discharge: "19 Feb 2026 14:00",
  attending: "Dr. Priya Nair",
  attendingSpecialty: "MD Internal Medicine",
  resident: "Dr. Aakash Verma",
  chiefComplaint: "Fatigue, breathlessness on exertion, pedal oedema for 3 weeks",
};

export const mockDiagnoses = [
  { name: "Type 2 Diabetes Mellitus", icd: "E11.9", snomed: "44054006", confidence: 96 },
  { name: "Hypertension", icd: "I10", snomed: "59621000", confidence: 93 },
  { name: "Anaemia - Iron Deficiency", icd: "D50.9", snomed: "87522002", confidence: 88 },
  { name: "Stage 2 Chronic Kidney Disease", icd: "N18.2", snomed: "709044004", confidence: 91 },
];

export const mockMedications = [
  { name: "Metformin 500mg", dosage: "BD", route: "PO", confidence: 94 },
  { name: "Amlodipine 5mg", dosage: "OD", route: "PO", confidence: 91 },
  { name: "Iron Sucrose 200mg", dosage: "TDS", route: "IV", confidence: 88 },
  { name: "Telmisartan 40mg", dosage: "OD", route: "PO", confidence: 96 },
  { name: "Furosemide 40mg", dosage: "OD", route: "PO", confidence: 79 },
  { name: "Pantoprazole 40mg", dosage: "OD", route: "PO", confidence: 85 },
];

export const mockLabValues = [
  { test: "Haemoglobin", value: "9.2", unit: "g/dL", ref: "13.5-17.5", status: "L" as const, loinc: "718-7", confidence: 98 },
  { test: "HbA1c", value: "8.4", unit: "%", ref: "<5.7", status: "H" as const, loinc: "4548-4", confidence: 97 },
  { test: "Creatinine", value: "1.8", unit: "mg/dL", ref: "0.7-1.3", status: "H" as const, loinc: "2160-0", confidence: 95 },
  { test: "eGFR", value: "42", unit: "mL/min", ref: ">60", status: "L" as const, loinc: "33914-3", confidence: 93 },
  { test: "Platelet Count", value: "142", unit: "×10³/µL", ref: "150-400", status: "L" as const, loinc: "777-3", confidence: 91 },
  { test: "Sodium", value: "138", unit: "mEq/L", ref: "136-145", status: "N" as const, loinc: "2951-2", confidence: 99 },
  { test: "Potassium", value: "4.1", unit: "mEq/L", ref: "3.5-5.0", status: "N" as const, loinc: "2823-3", confidence: 98 },
  { test: "Total Bilirubin", value: "0.9", unit: "mg/dL", ref: "0.3-1.2", status: "N" as const, loinc: "1975-2", confidence: 96 },
  { test: "Urine Albumin", value: "2+", unit: "qualitative", ref: "Negative", status: "H" as const, loinc: "1754-1", confidence: 87 },
  { test: "Blood Urea", value: "52", unit: "mg/dL", ref: "7-25", status: "H" as const, loinc: "3094-0", confidence: 94 },
];

export const mockVitals = [
  { name: "Blood Pressure", value: "148/92 mmHg", confidence: 91 },
  { name: "Pulse", value: "88/min", confidence: 95 },
  { name: "SpO2", value: "96%", confidence: 94 },
  { name: "Temperature", value: "98.2°F", confidence: 97 },
];

export const mockProcedures = [
  { name: "IV Cannulation", snomed: "392230005", day: "Day 1", confidence: 92 },
  { name: "Renal Ultrasound", snomed: "45036003", day: "Day 2", findings: "Bilateral kidneys mildly reduced in size", confidence: 89 },
  { name: "ECG", snomed: "29303009", day: "Day 1", findings: "Normal sinus rhythm", confidence: 94 },
  { name: "Iron Sucrose Infusion ×3 sessions", snomed: "14152002", day: "Day 2-4", confidence: 87 },
];

export const mockDischargeInstructions = [
  { label: "Dietary Restrictions", value: "Low salt diet (<2g/day), diabetic diet, fluid restriction 1.5L/day", confidence: 90 },
  { label: "Activity & Monitoring", value: "Monitor BP twice daily, avoid NSAIDs", confidence: 88 },
  { label: "Medications", value: "Continue all discharge medications as prescribed", confidence: 95 },
];

export const mockFollowUp = [
  { label: "Nephrology Follow-Up", value: "In 2 weeks at AIIMS Nephrology OPD", confidence: 91 },
  { label: "Repeat Labs", value: "In 4 weeks — CBC, RFT, HbA1c, Urine ACR", confidence: 89 },
];

export const mockComplianceItems = [
  { label: "Patient resource present and valid", status: "pass" as const },
  { label: "Encounter resource with valid period", status: "pass" as const },
  { label: "All Conditions have ICD-10 codes", status: "pass" as const },
  { label: "All Observations have LOINC codes", status: "pass" as const },
  { label: "MedicationRequest resources reference valid medications", status: "pass" as const },
  { label: "Practitioner resources with valid NMC identifiers", status: "pass" as const },
  { label: "MedicationRequest.dosageInstruction.timing — 1 resource missing coded timing value", status: "warning" as const },
  { label: "Bundle.identifier present and unique", status: "pass" as const },
];

export const mockValidationIssues = [
  {
    severity: "warning" as const,
    path: "MedicationRequest/med-furosemide-001",
    fhirPath: "dosageInstruction.timing.code",
    message: "Timing code should use SNOMED or NullFlavor — plain text value 'OD' used",
    fixField: "Medications",
    fullMessage: `HL7 FHIR Validation Warning:
Resource: MedicationRequest/med-furosemide-001
Path: MedicationRequest.dosageInstruction[0].timing.code
Severity: WARNING
Message: The code 'OD' in element 'timing.code' is not from a required ValueSet binding.
  Expected: SNOMED CT timing codes or NullFlavor.
  Found: Plain text value without system URI.
Specification: FHIR R4 — MedicationRequest.dosageInstruction.timing
Profile: NRCeS NHCX MedicationRequest Profile v2.1`,
  },
  {
    severity: "warning" as const,
    path: "Observation/obs-urine-alb-001",
    fhirPath: "performer",
    message: "Performer reference could not be resolved — Observation.performer[0] references Practitioner not included in Bundle",
    fixField: "Lab Investigations",
    fullMessage: `HL7 FHIR Validation Warning:
Resource: Observation/obs-urine-alb-001
Path: Observation.performer[0]
Severity: WARNING
Message: Unable to resolve reference 'Practitioner/pract-lab-001'.
  The referenced Practitioner resource is not included in the Bundle.
  This may cause issues during processing at the ABDM gateway.
Specification: FHIR R4 — Observation.performer
Profile: NRCeS NHCX DiagnosticReport-Lab Profile v2.1`,
  },
];

export const mockRecentJobs = [
  { id: "1", name: "DS_RahulSharma_Feb2026.pdf", size: "2.4 MB", type: "Discharge Summary" as const, patient: "Rahul Sharma", abha: "12-3456-7890-1234", detected: "2 min ago", confidence: 96, healthScore: 96, status: "Completed" as const },
  { id: "2", name: "DR_Lab_AnjaliPatel.pdf", size: "1.1 MB", type: "Diagnostic Report" as const, patient: "Anjali Patel", abha: "98-7654-3210-5678", detected: "15 min ago", confidence: 91, healthScore: 88, status: "Completed" as const },
  { id: "3", name: "DS_VikramSingh_Feb2026.pdf", size: "3.2 MB", type: "Discharge Summary" as const, patient: "Vikram Singh", abha: "45-6789-0123-4567", detected: "1 hr ago", confidence: 89, healthScore: 92, status: "Completed" as const },
  { id: "4", name: "DR_Imaging_SureshKumar.pdf", size: "5.8 MB", type: "Diagnostic Report" as const, patient: "Suresh Kumar", abha: "34-5678-9012-3456", detected: "Just now", confidence: 78, healthScore: 0, status: "Processing" as const },
  { id: "5", name: "DS_MeeraBai_Jan2026.pdf", size: "2.1 MB", type: "Discharge Summary" as const, patient: "Meera Bai", abha: "23-4567-8901-2345", detected: "2 hrs ago", confidence: 94, healthScore: 95, status: "Completed" as const },
  { id: "6", name: "DR_Lab_KiranDesai.pdf", size: "0.9 MB", type: "Diagnostic Report" as const, patient: "Kiran Desai", abha: "56-7890-1234-5678", detected: "3 hrs ago", confidence: 87, healthScore: 84, status: "Completed" as const },
  { id: "7", name: "DS_AmitPrasad_Feb2026.pdf", size: "2.7 MB", type: "Discharge Summary" as const, patient: "Amit Prasad", abha: "67-8901-2345-6789", detected: "5 hrs ago", confidence: 93, healthScore: 91, status: "Completed" as const },
  { id: "8", name: "DR_Lab_PoojaGupta.pdf", size: "1.4 MB", type: "Diagnostic Report" as const, patient: "Pooja Gupta", abha: "78-9012-3456-7890", detected: "6 hrs ago", confidence: 90, healthScore: 89, status: "Completed" as const },
  { id: "9", name: "DS_RaviShankar_Jan2026.pdf", size: "3.0 MB", type: "Discharge Summary" as const, patient: "Ravi Shankar", abha: "89-0123-4567-8901", detected: "1 day ago", confidence: 85, healthScore: 82, status: "Completed" as const },
  { id: "10", name: "DR_Imaging_DeepaMishra.pdf", size: "6.2 MB", type: "Diagnostic Report" as const, patient: "Deepa Mishra", abha: "90-1234-5678-9012", detected: "1 day ago", confidence: 72, healthScore: 68, status: "Failed" as const },
  { id: "11", name: "DS_SanjayKumar_Jan2026.pdf", size: "2.5 MB", type: "Discharge Summary" as const, patient: "Sanjay Kumar", abha: "01-2345-6789-0123", detected: "2 days ago", confidence: 92, healthScore: 94, status: "Completed" as const },
  { id: "12", name: "DR_Lab_NitaReddy.pdf", size: "1.0 MB", type: "Diagnostic Report" as const, patient: "Nita Reddy", abha: "12-3456-7891-2345", detected: "2 days ago", confidence: 88, healthScore: 86, status: "Completed" as const },
];

export const mockResourceTree = [
  {
    type: "Bundle", id: "Transaction", status: "pass" as const, resourceCount: 31, children: [
      { type: "Patient", id: "patient-rahul-001", status: "pass" as const },
      { type: "Encounter", id: "enc-admit-001", status: "pass" as const },
      { type: "Condition", id: "cond-dm-001", status: "pass" as const, label: "T2 Diabetes Mellitus" },
      { type: "Condition", id: "cond-htn-001", status: "pass" as const, label: "Hypertension" },
      { type: "Condition", id: "cond-anaemia-001", status: "pass" as const, label: "Iron Deficiency Anaemia" },
      { type: "Condition", id: "cond-ckd-001", status: "pass" as const, label: "CKD Stage 2" },
      { type: "Procedure", id: "proc-iv-001", status: "pass" as const, label: "IV Cannulation" },
      { type: "Procedure", id: "proc-usg-001", status: "pass" as const, label: "Renal Ultrasound" },
      { type: "Procedure", id: "proc-ecg-001", status: "pass" as const, label: "ECG" },
      { type: "Procedure", id: "proc-iron-001", status: "pass" as const, label: "Iron Sucrose Infusion" },
      { type: "MedicationRequest", id: "med-metformin-001", status: "pass" as const, label: "Metformin 500mg" },
      { type: "MedicationRequest", id: "med-amlodipine-001", status: "pass" as const, label: "Amlodipine 5mg" },
      { type: "MedicationRequest", id: "med-ironsucrose-001", status: "pass" as const, label: "Iron Sucrose 200mg" },
      { type: "MedicationRequest", id: "med-telmisartan-001", status: "pass" as const, label: "Telmisartan 40mg" },
      { type: "MedicationRequest", id: "med-furosemide-001", status: "warning" as const, label: "Furosemide 40mg" },
      { type: "MedicationRequest", id: "med-pantoprazole-001", status: "pass" as const, label: "Pantoprazole 40mg" },
      { type: "Observation", id: "obs-hb-001", status: "pass" as const, label: "Haemoglobin" },
      { type: "Observation", id: "obs-hba1c-001", status: "pass" as const, label: "HbA1c" },
      { type: "Observation", id: "obs-creat-001", status: "pass" as const, label: "Creatinine" },
      { type: "Observation", id: "obs-egfr-001", status: "pass" as const, label: "eGFR" },
      { type: "Observation", id: "obs-plt-001", status: "pass" as const, label: "Platelet Count" },
      { type: "Observation", id: "obs-na-001", status: "pass" as const, label: "Sodium" },
      { type: "Observation", id: "obs-k-001", status: "pass" as const, label: "Potassium" },
      { type: "Observation", id: "obs-bili-001", status: "pass" as const, label: "Total Bilirubin" },
      { type: "Observation", id: "obs-urine-alb-001", status: "warning" as const, label: "Urine Albumin" },
      { type: "Observation", id: "obs-urea-001", status: "pass" as const, label: "Blood Urea" },
      { type: "Observation", id: "obs-bp-001", status: "pass" as const, label: "Blood Pressure" },
      { type: "Observation", id: "obs-pulse-001", status: "pass" as const, label: "Pulse" },
      { type: "Practitioner", id: "pract-priya-001", status: "pass" as const, label: "Dr. Priya Nair" },
      { type: "Practitioner", id: "pract-aakash-001", status: "pass" as const, label: "Dr. Aakash Verma" },
      { type: "Organization", id: "org-aiims-001", status: "pass" as const, label: "AIIMS New Delhi" },
    ],
  },
];

export const mockFHIRBundle = `{
  "resourceType": "Bundle",
  "id": "ds-rahul-sharma-feb2026",
  "meta": {
    "lastUpdated": "2026-02-19T14:30:00+05:30",
    "profile": [
      "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle"
    ]
  },
  "identifier": {
    "system": "https://aiims.edu/bundles",
    "value": "ds-rahul-sharma-feb2026-001"
  },
  "type": "transaction",
  "timestamp": "2026-02-19T14:30:00+05:30",
  "entry": [
    {
      "fullUrl": "urn:uuid:patient-rahul-001",
      "resource": {
        "resourceType": "Patient",
        "id": "patient-rahul-001",
        "meta": {
          "profile": [
            "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"
          ]
        },
        "identifier": [
          {
            "system": "https://healthid.abdm.gov.in",
            "value": "12-3456-7890-1234",
            "type": {
              "coding": [
                {
                  "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                  "code": "MR",
                  "display": "Medical Record Number"
                }
              ]
            }
          }
        ],
        "name": [
          {
            "use": "official",
            "text": "Rahul Sharma",
            "given": ["Rahul"],
            "family": "Sharma"
          }
        ],
        "gender": "male",
        "birthDate": "1981-03-15",
        "extension": [
          {
            "url": "https://nrces.in/ndhm/fhir/r4/StructureDefinition/BloodGroup",
            "valueCodeableConcept": {
              "coding": [
                {
                  "system": "http://snomed.info/sct",
                  "code": "112144000",
                  "display": "Blood group B Rh(D) positive"
                }
              ]
            }
          }
        ]
      },
      "request": { "method": "POST", "url": "Patient" }
    },
    {
      "fullUrl": "urn:uuid:cond-dm-001",
      "resource": {
        "resourceType": "Condition",
        "id": "cond-dm-001",
        "meta": {
          "profile": [
            "https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition"
          ]
        },
        "code": {
          "coding": [
            {
              "system": "http://hl7.org/fhir/sid/icd-10",
              "code": "E11.9",
              "display": "Type 2 Diabetes Mellitus"
            },
            {
              "system": "http://snomed.info/sct",
              "code": "44054006",
              "display": "Diabetes mellitus type 2"
            }
          ]
        },
        "clinicalStatus": {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
              "code": "active"
            }
          ]
        },
        "subject": { "reference": "urn:uuid:patient-rahul-001" },
        "encounter": { "reference": "urn:uuid:enc-admit-001" }
      },
      "request": { "method": "POST", "url": "Condition" }
    },
    {
      "fullUrl": "urn:uuid:med-metformin-001",
      "resource": {
        "resourceType": "MedicationRequest",
        "id": "med-metformin-001",
        "status": "active",
        "intent": "order",
        "medicationCodeableConcept": {
          "coding": [
            {
              "system": "http://snomed.info/sct",
              "code": "372567009",
              "display": "Metformin"
            }
          ],
          "text": "Metformin 500mg"
        },
        "subject": { "reference": "urn:uuid:patient-rahul-001" },
        "dosageInstruction": [
          {
            "text": "500mg twice daily oral",
            "timing": {
              "code": {
                "coding": [
                  {
                    "system": "http://snomed.info/sct",
                    "code": "229799001",
                    "display": "Twice a day"
                  }
                ]
              }
            },
            "route": {
              "coding": [
                {
                  "system": "http://snomed.info/sct",
                  "code": "26643006",
                  "display": "Oral route"
                }
              ]
            }
          }
        ]
      },
      "request": { "method": "POST", "url": "MedicationRequest" }
    },
    {
      "fullUrl": "urn:uuid:obs-hb-001",
      "resource": {
        "resourceType": "Observation",
        "id": "obs-hb-001",
        "status": "final",
        "code": {
          "coding": [
            {
              "system": "http://loinc.org",
              "code": "718-7",
              "display": "Hemoglobin [Mass/volume] in Blood"
            }
          ]
        },
        "subject": { "reference": "urn:uuid:patient-rahul-001" },
        "valueQuantity": {
          "value": 9.2,
          "unit": "g/dL",
          "system": "http://unitsofmeasure.org",
          "code": "g/dL"
        },
        "referenceRange": [
          {
            "low": { "value": 13.5, "unit": "g/dL" },
            "high": { "value": 17.5, "unit": "g/dL" }
          }
        ],
        "interpretation": [
          {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                "code": "L",
                "display": "Low"
              }
            ]
          }
        ]
      },
      "request": { "method": "POST", "url": "Observation" }
    }
  ]
}
// ... 27 more resources (Encounter, 3 Conditions, 3 Procedures, 5 MedicationRequests, 11 Observations, 2 Practitioners, 1 Organization)`;

export function downloadMockFHIRBundle(patientName: string): void {
  const blob = new Blob([mockFHIRBundle], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${patientName.replace(/\s+/g, '_')}_FHIR_Bundle.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateMockCSV(jobs: typeof mockRecentJobs): string {
  const header = 'Document,Type,Patient,ABHA,Detected,Confidence,Health Score,Status\n';
  const rows = jobs.map(j =>
    `"${j.name}","${j.type}","${j.patient}","${j.abha}","${j.detected}","${j.confidence}%","${j.healthScore > 0 ? j.healthScore + '/100' : '-'}","${j.status}"`
  ).join('\n');
  return header + rows;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
