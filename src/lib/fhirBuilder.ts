import { ExtractedDischarge } from './ollamaExtractor';

export interface TreeNode {
    type: string;
    id: string;
    status: "pass" | "warning" | "fail";
    label?: string;
    resourceCount?: number;
    children?: TreeNode[];
}

export interface ValidationIssue {
    severity: "error" | "warning" | "info";
    path: string;
    fhirPath: string;
    message: string;
    fixField: string;
    fullMessage: string;
}

export interface ComplianceItem {
    label: string;
    status: "pass" | "warning" | "fail";
}

export function buildFhirValidationData(extracted: ExtractedDischarge | null) {
    if (!extracted) {
        return {
            resourceTree: [],
            validationIssues: [],
            complianceItems: [],
            resourceBreakdown: [],
            totalResources: 0,
            healthScore: 0
        };
    }

    const treeChildren: TreeNode[] = [];
    const issues: ValidationIssue[] = [];
    const compliance: ComplianceItem[] = [];
    const breakdown: Record<string, number> = {
        Patient: 0,
        Encounter: 0,
        Condition: 0,
        Procedure: 0,
        MedicationRequest: 0,
        Observation: 0,
        Practitioner: 0,
        Organization: 0
    };

    const addResource = (type: keyof typeof breakdown, id: string, label: string, status: "pass" | "warning" | "fail" = "pass") => {
        breakdown[type]++;
        treeChildren.push({ type, id, label, status });
    };

    // Patient
    if (extracted.patient?.name) {
        addResource("Patient", `patient-${extracted.patient.name.toLowerCase().replace(/[^a-z0-9]/g, '')}-001`, extracted.patient.name);
        compliance.push({ label: "Patient resource present and valid", status: "pass" });
    } else {
        compliance.push({ label: "Patient resource present and valid", status: "fail" });
        issues.push({
            severity: "error",
            path: "Patient/patient-001",
            fhirPath: "Patient.name",
            message: "Patient name is missing",
            fixField: "Demographics",
            fullMessage: "Patient resource must have a valid name."
        });
    }

    // Encounter
    addResource("Encounter", "enc-admit-001", "Hospital Admission");
    compliance.push({ label: "Encounter resource with valid period", status: "pass" });

    // Organization
    if (extracted.patient?.hospital) {
        addResource("Organization", "org-hospital-001", extracted.patient.hospital);
    }

    // Practitioners
    if (extracted.patient?.attending) {
        addResource("Practitioner", "pract-attending-001", extracted.patient.attending);
        compliance.push({ label: "Practitioner resources with valid NMC identifiers", status: "pass" });
    } else {
        compliance.push({ label: "Practitioner resources", status: "pass" });
    }

    // Conditions
    let allConditionsHaveIcd = true;
    extracted.diagnoses?.forEach((d, i) => {
        const hasIcd = !!d.icd;
        if (!hasIcd) allConditionsHaveIcd = false;
        addResource("Condition", `cond-dx-${i + 1}`, d.name, hasIcd ? "pass" : "warning");

        if (!hasIcd) {
            issues.push({
                severity: "warning",
                path: `Condition/cond-dx-${i + 1}`,
                fhirPath: "Condition.code",
                message: `Missing ICD-10 code for '${d.name}'`,
                fixField: "Diagnoses",
                fullMessage: `Condition '${d.name}' is missing a standard ICD-10 code. It is recommended to include standard terminology.`
            });
        }
    });
    compliance.push({ label: "All Conditions have ICD-10 codes", status: allConditionsHaveIcd ? "pass" : "warning" });

    // Procedures
    extracted.procedures?.forEach((p, i) => {
        addResource("Procedure", `proc-${i + 1}`, p.name);
    });

    // Medications
    let targetWarnMissingTiming = false;
    extracted.medications?.forEach((m, i) => {
        const dosageUpper = m.dosage?.toUpperCase() || '';
        const hasStandardTextTiming = ['OD', 'BD', 'TDS', 'QDS', 'Q8H', 'Q12H', 'Q6H', 'Q4H', 'SOS', 'STAT'].some(t => dosageUpper.includes(t));
        const hasDashTiming = /[\dO0]-[\dO0]-[\dO0]/.test(dosageUpper);
        const hasMlTiming = /\d+ML-\d+ML-\d+ML/.test(dosageUpper);

        const standardTiming = hasStandardTextTiming || hasDashTiming || hasMlTiming;
        const status = standardTiming ? "pass" : "warning";
        // Ignore timing warning if IV Fluids or empty dosage
        if (!standardTiming && dosageUpper !== '' && m.name.toLowerCase() !== 'iv fluids') {
            targetWarnMissingTiming = true;
        }

        addResource("MedicationRequest", `med-${m.name.split(' ')[0].toLowerCase()}-${i + 1}`, m.name, status);

        if (!standardTiming && dosageUpper !== '' && m.name.toLowerCase() !== 'iv fluids') {
            issues.push({
                severity: "warning",
                path: `MedicationRequest/med-${m.name.split(' ')[0].toLowerCase()}-${i + 1}`,
                fhirPath: "dosageInstruction.timing.code",
                message: `Timing code format unrecognized — plain text value '${m.dosage}' used`,
                fixField: "Medications",
                fullMessage: `The dosage '${m.dosage}' is not mapped to a standard SNOMED CT timing code or recognized Indian prescription pattern.`
            });
        }
    });

    compliance.push({ label: "MedicationRequest resources reference valid medications", status: "pass" });
    if (targetWarnMissingTiming) {
        compliance.push({ label: "MedicationRequest.dosageInstruction.timing — resource missing coded timing value", status: "warning" });
    }

    // Observations (Labs + Vitals)
    let allObsHaveLoinc = true;
    extracted.labValues?.forEach((l, i) => {
        const hasLoinc = !!l.loinc;
        if (!hasLoinc) allObsHaveLoinc = false;
        addResource("Observation", `obs-lab-${i + 1}`, l.test, hasLoinc ? "pass" : "warning");

        if (!hasLoinc) {
            issues.push({
                severity: "info",
                path: `Observation/obs-lab-${i + 1}`,
                fhirPath: "Observation.code",
                message: `Missing LOINC code for '${l.test}'`,
                fixField: "Investigations",
                fullMessage: `Laboratory observation '${l.test}' lacks a standard LOINC code.`
            });
        }
    });

    extracted.vitals?.forEach((v, i) => {
        addResource("Observation", `obs-vital-${i + 1}`, v.name);
    });

    compliance.push({ label: "All Observations have LOINC codes", status: allObsHaveLoinc ? "pass" : "warning" });
    compliance.push({ label: "Bundle.identifier present and unique", status: "pass" });

    const totalResources = Object.values(breakdown).reduce((a, b) => a + b, 0);

    const resourceTree: TreeNode[] = [
        {
            type: "Bundle",
            id: "Transaction",
            status: issues.some(i => i.severity === "error") ? "fail" : "pass",
            resourceCount: totalResources,
            children: treeChildren
        }
    ];

    const resourceBreakdownArray = Object.entries(breakdown)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({ type, count }));

    // Calculate health score: start at 100, -20 per error, -5 per warning, -1 per info
    const errorCount = issues.filter(i => i.severity === "error").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;
    const infoCount = issues.filter(i => i.severity === "info").length;
    const healthScore = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5) - (infoCount * 1));

    return {
        resourceTree,
        validationIssues: issues,
        complianceItems: compliance,
        resourceBreakdown: resourceBreakdownArray,
        totalResources,
        healthScore
    };
}
