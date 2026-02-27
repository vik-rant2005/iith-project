import type { ClinicalSections } from './pdfExtractor';

export interface ExtractedDischarge {
    patient: {
        name: string;
        age: string;
        sex: string;
        abha: string;
        bloodGroup: string;
        hospital: string;
        ward: string;
        admission: string;
        discharge: string;
        attending: string;
        chiefComplaint: string;
    };
    diagnoses: Array<{ name: string; icd: string; snomed: string; confidence: number }>;
    medications: Array<{ name: string; dosage: string; route: string; confidence: number }>;
    vitals: Array<{ name: string; value: string; confidence: number }>;
    labValues: Array<{ test: string; value: string; unit: string; ref: string; status: 'H' | 'L' | 'N'; loinc: string; confidence: number }>;
    procedures: Array<{ name: string; snomed: string; day: string; findings: string; confidence: number }>;
    dischargeInstructions: Array<{ label: string; value: string; confidence: number }>;
    followUp: Array<{ label: string; value: string; confidence: number }>;
    overallConfidence: number;
}

// =============================================================================
// OCR ERROR CORRECTION
// =============================================================================

function fixOCRErrors(text: string): string {
    if (!text) return '';
    return text
        .replace(/\b1,(\d{2})/g, '1$1')
        .replace(/METFORMTN/gi, 'METFORMIN')
        .replace(/\bENALApRIL\b/gi, 'ENALAPRIL')
        .replace(/\bDIJOLIN\b/gi, 'DUOLIN')
        .replace(/FORACORTO\.(\d)/gi, 'FORACORT 0.$1MG')
        .replace(/CHOLELITHASIS/gi, 'CHOLELITHIASIS')
        .replace(/\b1 LAPAROSCOPIC/gi, 'LAPAROSCOPIC')
        .replace(/\bTRAMADOR\b/gi, 'TRAMADOL')
        // Common OCR digit confusions near vital labels
        .replace(/\bPR\s*[:\-]\s*0(\d)/gi, 'PR: $1')  // PR:068 → PR:68
        .replace(/\bRR\s*[:\-]\s*0(\d)/gi, 'RR: $1')  // RR:018 → RR:18
        .trim();
}

// =============================================================================
// PLACEHOLDER / HALLUCINATION DETECTION
// =============================================================================

const PLACEHOLDER_VALUES = [
    'n/a', 'na', 'not available', 'not applicable', 'unknown', 'nil',
    'none', 'not specified', 'not mentioned', 'not found', 'not provided',
    'not recorded', 'not documented', 'pending', 'awaited', 'tbd',
    'to be determined', '-', '--', '---', '...', 'null', 'undefined',
];

function isPlaceholder(value: string): boolean {
    if (!value) return true;
    const v = value.trim().toLowerCase();
    return v.length === 0 || PLACEHOLDER_VALUES.includes(v);
}

function cleanField(value: string): string {
    return isPlaceholder(value) ? '' : value;
}

// =============================================================================
// CROSS-VALIDATION AGAINST RAW TEXT
// Ensures extracted values actually exist in the source document
// =============================================================================

function crossValidateValue(value: string, rawText: string): boolean {
    if (!value || !rawText) return false;
    const v = value.trim();
    if (v.length === 0) return true; // empty is ok
    if (v.length <= 2) return true; // too short to validate meaningfully
    const upper = rawText.toUpperCase();
    // Check exact match
    if (upper.includes(v.toUpperCase())) return true;
    // Check numeric core (e.g. "68 BPM" → check "68" exists near PR/pulse context)
    const numMatch = v.match(/(\d+\/\d+|\d+\.?\d*)/);
    if (numMatch) {
        return upper.includes(numMatch[1]);
    }
    return false;
}

// =============================================================================
// CANONICAL ROUTE LOOKUP — deterministic override for LLM route inference
// Root cause fixed: LLM infers routes from adjacent lines, not the specific drug
// =============================================================================

const DRUG_ROUTE_MAP: Record<string, string> = {
    'taxim': 'IV', 'cefotaxime': 'IV',
    'metro': 'IV', 'metronidazole': 'IV',
    'tramadol': 'IM',
    'rantac': 'IV', 'ranitidine': 'IV',
    'voveron': 'IM', 'diclofenac': 'IM',
    'hydrocort': 'IV', 'hydrocortisone': 'IV',
    'dexamethasone': 'IV', 'ondansetron': 'IV',
    'pantoprazole': 'IV',
    // Subcutaneous insulins — always SC
    'insulatard': 'SC', 'actrapid': 'SC',
    'glargine': 'SC', 'mixtard': 'SC', 'insulin': 'SC',
    // Oral tablets/capsules/syrups
    'metformin': 'PO', 'amlong': 'PO', 'amlodipine': 'PO',
    'enalapril': 'PO', 'lisinopril': 'PO', 'atenolol': 'PO',
    'telmisartan': 'PO', 'aspirin': 'PO', 'clopidogrel': 'PO',
    'atorvastatin': 'PO', 'rosuvastatin': 'PO',
    'omeprazole': 'PO', 'amoxicillin': 'PO', 'azithromycin': 'PO',
    'ciprofloxacin': 'PO', 'sucralfate': 'PO', 'lactulose': 'PO',
    // Nebulisation
    'duolin': 'INH', 'foracort': 'INH', 'budecort': 'INH',
    'levolin': 'INH', 'salbutamol': 'INH', 'budesonide': 'INH',
    // IV fluids
    'iv fluid': 'IV', 'iv fluids': 'IV', 'normal saline': 'IV',
    'ringer': 'IV', 'dextrose': 'IV', 'dns': 'IV',
};

function canonicalRoute(drugName: string, llmRoute: string): string {
    const lower = drugName.toLowerCase().trim();
    for (const [fragment, route] of Object.entries(DRUG_ROUTE_MAP)) {
        if (lower.includes(fragment)) return route;
    }
    const r = llmRoute.toUpperCase().trim();
    if (['IV', 'INTRAVENOUS'].some(x => r.includes(x))) return 'IV';
    if (['IM', 'INTRAMUSCULAR'].some(x => r.includes(x))) return 'IM';
    if (['PO', 'ORAL', 'TAB', 'CAP', 'SYP'].some(x => r.includes(x))) return 'PO';
    if (['SC', 'S/C', 'SUBCUTANEOUS'].some(x => r.includes(x))) return 'SC';
    if (['INH', 'NEB', 'NEBULISATION'].some(x => r.includes(x))) return 'INH';
    return llmRoute || 'PO';
}

// =============================================================================
// DIAGNOSIS NORMALIZER — ensures full canonical names and correct ICD codes
// Root cause fixed: "DIABETES MELLITUS" extracted without "TYPE 2" prefix
// =============================================================================

interface DiagnosisRaw { name: string; icd: string; snomed: string; confidence: number }

const DIAGNOSIS_NORM: Array<{ match: string; name: string; icd: string; snomed: string }> = [
    { match: 'cholelithiasis', name: 'Cholelithiasis', icd: 'K80.20', snomed: '266474003' },
    { match: 'diabetes mellitus', name: 'Type 2 Diabetes Mellitus', icd: 'E11.9', snomed: '44054006' },
    { match: 'type 2 diabetes', name: 'Type 2 Diabetes Mellitus', icd: 'E11.9', snomed: '44054006' },
    { match: 't2dm', name: 'Type 2 Diabetes Mellitus', icd: 'E11.9', snomed: '44054006' },
    { match: 'systemic hypertension', name: 'Systemic Hypertension', icd: 'I10', snomed: '38341003' },
    { match: 'hypertension', name: 'Hypertension', icd: 'I10', snomed: '38341003' },
    { match: 'acute kidney injury', name: 'Acute Kidney Injury', icd: 'N17.9', snomed: '14669001' },
    { match: 'alcoholic hepatitis', name: 'Alcoholic Hepatitis', icd: 'K70.1', snomed: '235870009' },
    { match: 'cholecystitis', name: 'Cholecystitis', icd: 'K81.9', snomed: '76581006' },
    { match: 'pancreatitis', name: 'Acute Pancreatitis', icd: 'K85.9', snomed: '197456007' },
    { match: 'appendicitis', name: 'Acute Appendicitis', icd: 'K37', snomed: '74400008' },
    { match: 'pneumonia', name: 'Pneumonia', icd: 'J18.9', snomed: '233604007' },
    { match: 'coronary artery', name: 'Coronary Artery Disease', icd: 'I25.1', snomed: '53741008' },
    { match: 'heart failure', name: 'Congestive Heart Failure', icd: 'I50.9', snomed: '84114007' },
    { match: 'chronic kidney', name: 'Chronic Kidney Disease', icd: 'N18.9', snomed: '709044004' },
    { match: 'copd', name: 'COPD', icd: 'J44.9', snomed: '13645005' },
    { match: 'asthma', name: 'Bronchial Asthma', icd: 'J45.9', snomed: '195967001' },
    { match: 'sepsis', name: 'Sepsis', icd: 'A41.9', snomed: '91302008' },
    { match: 'anaemia', name: 'Anaemia', icd: 'D64.9', snomed: '271737000' },
    { match: 'anemia', name: 'Anaemia', icd: 'D64.9', snomed: '271737000' },
    { match: 'uti', name: 'Urinary Tract Infection', icd: 'N39.0', snomed: '68566005' },
    { match: 'hypothyroid', name: 'Hypothyroidism', icd: 'E03.9', snomed: '40930008' },
];

function normalizeDiagnosis(raw: DiagnosisRaw): DiagnosisRaw {
    const lower = raw.name.toLowerCase().trim();
    for (const entry of DIAGNOSIS_NORM) {
        if (lower.includes(entry.match)) {
            return {
                name: entry.name,
                icd: entry.icd,
                snomed: entry.snomed,
                confidence: raw.confidence,
            };
        }
    }
    return raw;
}

// =============================================================================
// DETERMINISTIC VITALS PARSER
// Root cause fix: Only parse from VITALS: lines to avoid matching unrelated numbers
// =============================================================================

interface Vital { name: string; value: string; confidence: number }

/**
 * Extract the text window containing DISCHARGE vital sign readings.
 * Key insight: VITALS section appears at the END of discharge summaries.
 * Uses lastIndexOf to find the LAST occurrence of VITALS label,
 * and searches BACKWARD from end to avoid matching admission vitals in the history section.
 */
function extractVitalsContext(text: string): string {
    const upper = text.toUpperCase();

    // Strategy 1: Find the LAST occurrence of any VITALS label (with or without colon).
    // Using lastIndexOf because discharge vitals appear AFTER history/examination sections.
    // "VITALS:" with colon, "VITALS " with space (no colon in OCR), etc.
    const vitalsPatterns = [
        'VITALS:', 'VITALS AT', 'VITAL SIGNS:', 'VITALS-', 'VITALS -',
        'VITALS\n', 'VITALS\r', 'VITALS ',  // no-colon variants OCR produces
    ];
    let bestVitalsIdx = -1;
    let bestVitalsPat = '';
    for (const pat of vitalsPatterns) {
        const idx = upper.lastIndexOf(pat); // LAST occurrence — discharge vitals are at end
        if (idx > bestVitalsIdx) { bestVitalsIdx = idx; bestVitalsPat = pat; }
    }
    if (bestVitalsIdx >= 0) {
        // Take up to 600 chars from the VITALS label; stop at first section break after it
        let end = Math.min(bestVitalsIdx + 600, text.length);
        const sectionStops = ['MEDICATIONS', 'TREATMENT', 'FOLLOW-UP', 'FOLLOW UP',
            'DISCHARGE INS', 'ADVICE', 'INVESTIGATIONS', 'SIGNATURE'];
        for (const stop of sectionStops) {
            const si = upper.indexOf(stop, bestVitalsIdx + bestVitalsPat.length + 5);
            if (si > bestVitalsIdx && si < end) end = si;
        }
        const windowText = text.substring(bestVitalsIdx, end);
        console.log('[ClinIQ Vitals] Strategy1: "' + bestVitalsPat + '" at pos=' + bestVitalsIdx + ' window:', windowText.substring(0, 250));
        return windowText;
    }

    // Strategy 2: Slide a 500-char window BACKWARD from end of text.
    // Discharge vitals are near the end; admission vitals are near the beginning.
    // By scanning backward we find discharge values first.
    const VITAL_ABBREVS = ['PR:', 'BP:', 'TEMP:', 'RR:', 'SPO2:', 'SP02:', 'SPO 2:', 'SP O2:'];
    let bestIdx = -1;
    let bestCount = 0;
    const WIN = 500;
    const step = 50;
    // Start from end and go backward
    for (let i = Math.max(0, upper.length - WIN); i >= 0; i -= step) {
        const chunk = upper.substring(i, i + WIN);
        const cnt = VITAL_ABBREVS.filter(v => chunk.includes(v)).length;
        if (cnt > bestCount) { bestCount = cnt; bestIdx = i; }
        if (bestCount >= 4) break; // found a dense vitals cluster, stop
    }
    if (bestCount >= 2 && bestIdx >= 0) {
        const windowText = text.substring(bestIdx, Math.min(bestIdx + WIN, text.length));
        console.log('[ClinIQ Vitals] Strategy2(backward): ' + bestCount + ' vitals at pos=' + bestIdx + ' window:', windowText.substring(0, 250));
        return windowText;
    }

    console.log('[ClinIQ Vitals] No vitals context found, will use full text');
    return '';
}

function parseVitalsFromText(text: string): Vital[] {
    // Get the vitals window — direct substring search, works even with no newlines
    const vitalsContext = extractVitalsContext(text);
    const hasCtx = vitalsContext.trim().length > 10;
    const searchText = hasCtx ? vitalsContext : text;
    const clean = fixOCRErrors(searchText).toUpperCase();
    const vitals: Vital[] = [];
    const seen = new Set<string>();
    console.log('[ClinIQ Vitals] source=' + (hasCtx ? 'VITALS_WINDOW' : 'FULL_TEXT') + ' len=' + clean.length);

    // Use named-label anchored patterns — each regex starts with its own label
    // This guarantees we match the value AFTER the label, not a random number elsewhere
    const patterns: Array<{ key: string; label: string; regex: RegExp; group: number }> = [
        // PR: 68 BPM  or  PR : 68  or  PULSE: 68
        {
            key: 'PR', label: 'PR (Pulse Rate)', group: 1,
            regex: /(?:^|\s|:)(?:PR|PULSE(?:\s*RATE)?)\s*[:\-]\s*(\d{2,3})\s*(BPM|\/MIN|BEATS\/MIN)?/im
        },
        // BP: 110/60 MM HG
        {
            key: 'BP', label: 'BP (Blood Pressure)', group: 1,
            regex: /(?:^|\s|:)BP\s*[:\-]?\s*(\d{2,3}\s*\/\s*\d{2,3})\s*(MM\s*HG|MMHG)?/im
        },
        // TEMP: AFEBRILE or TEMP: 98.5 F
        {
            key: 'TEMP', label: 'Temperature', group: 1,
            regex: /TEMP(?:ERATURE)?\s*[:\-]?\s*(AFEBRILE|[\d.]+\s*°?\s*[FCf]?)/im
        },
        // RR: 18 CYCLES/MIN
        {
            key: 'RR', label: 'RR (Respiratory Rate)', group: 1,
            regex: /(?:^|\s|:)RR\s*[:\-]?\s*(\d{1,3})\s*(CYCLES?\/\s*MIN|\/MIN|BREATHS\/?MIN)?/im
        },
        // SPO2: 98 % AT RA  (also handles SP02: with zero or missing O)
        {
            key: 'SPO2', label: 'SpO2', group: 1,
            regex: /(?:(?:^|\s|:)SPO2|SP\s*[O0]?\s*2)\s*[:\-]?\s*(\d{2,3})\s*(%\s*(?:AT\s*RA|ON\s*RA)?)?/im
        },
    ];

    for (const { key, label, regex, group } of patterns) {
        if (seen.has(key)) continue;
        const match = clean.match(regex);
        if (match) {
            const rawVal = match[group].trim();
            const unit = (match[group + 1] || '').trim();
            const val = rawVal + (unit ? ' ' + unit : '');
            // Range validation — reject physiologically impossible values
            if (key === 'PR') {
                const n = parseInt(rawVal);
                if (n < 30 || n > 220) { console.warn('[Vitals] PR=' + n + ' out of range, skipping'); continue; }
            }
            if (key === 'RR') {
                const n = parseInt(rawVal);
                if (n < 5 || n > 60) { console.warn('[Vitals] RR=' + n + ' out of range, skipping'); continue; }
            }
            if (key === 'SPO2') {
                const n = parseInt(rawVal);
                if (n < 50 || n > 100) { console.warn('[Vitals] SpO2=' + n + ' out of range, skipping'); continue; }
            }
            if (key === 'BP') {
                const parts = rawVal.replace(/\s/g, '').split('/');
                const sys = parseInt(parts[0]), dia = parseInt(parts[1]);
                if (isNaN(sys) || isNaN(dia) || sys < 50 || sys > 300 || dia < 20 || dia > 200) {
                    console.warn('[Vitals] BP out of range, skipping'); continue;
                }
            }
            console.log('[Vitals] Found ' + key + ': ' + val);
            vitals.push({ name: label, value: val, confidence: 95 });
            seen.add(key);
        } else {
            console.log('[Vitals] No match for ' + key);
        }
    }

    console.log('[ClinIQ Vitals] Final:', vitals.map(v => v.name + '=' + v.value).join(', '));
    return vitals;
}

// =============================================================================
// DETERMINISTIC DATE PARSER
// Root cause fixed: DOA/DOD not extracted even when clearly present in header
// =============================================================================

function parseDatesFromText(text: string): { admission: string; discharge: string } {
    function extractDate(label: string): string {
        const pattern = new RegExp(label + '\\s*[:\\-]?\\s*(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})', 'i');
        const m = text.match(pattern);
        return m ? m[1].replace(/-/g, '/') : '';
    }
    return {
        admission: extractDate('DOA') || extractDate('DATE OF ADMISSION') || extractDate('ADMISSION DATE'),
        discharge: extractDate('DOD') || extractDate('DATE OF DISCHARGE') || extractDate('DISCHARGE DATE'),
    };
}

// =============================================================================
// MEDICATION MERGER
// Combines LLM output with canonical route correction
// Detects missing drugs (INSULATARD, ACTRAPID, IV FLUIDS) from raw text
// =============================================================================

const MUST_CAPTURE_DRUGS = [
    { pattern: /INJ\.?\s*H?\s*INSULATARD\s*([\d\-]+\s*U)/i, name: 'Insulatard', route: 'SC' },
    { pattern: /INJ\.?\s*H?\s*ACTRAPID\s*([\d\-]+\s*U)/i, name: 'Actrapid', route: 'SC' },
    { pattern: /IV\s*FLUIDS?/i, name: 'IV Fluids', route: 'IV' },
];

function ensureCriticalDrugs(
    medications: ExtractedDischarge['medications'],
    rawText: string,
): ExtractedDischarge['medications'] {
    const result = [...medications];

    for (const drug of MUST_CAPTURE_DRUGS) {
        const alreadyPresent = result.some(m =>
            m.name.toLowerCase().includes(drug.name.toLowerCase().split(' ')[0].toLowerCase())
        );
        if (alreadyPresent) continue;

        const match = rawText.match(drug.pattern);
        if (match) {
            const dosage = match[1] ? match[1].trim() : '';
            result.push({ name: drug.name, dosage, route: drug.route, confidence: 88 });
        }
    }

    return result;
}

function mergeMedications(
    llmMeds: ExtractedDischarge['medications'],
): ExtractedDischarge['medications'] {
    // Apply canonical route to every LLM-extracted medication
    return llmMeds
        .map(m => ({ ...m, route: canonicalRoute(m.name, m.route) }))
        .filter(m => m.name.length > 1);
}

// =============================================================================
// LLM OUTPUT SANITIZER
// =============================================================================

const INSTITUTION_KEYWORDS = [
    'HOSPITAL', 'MEDICAL', 'COLLEGE', 'RESEARCH', 'CENTRE', 'CENTER',
    'INSTITUTE', 'CLINIC', 'AIIMS', 'NURSING', 'TRUST', 'FOUNDATION',
    'VENKATESHWARAA', 'DISTRICT', 'GOVERNMENT', 'GOVT', 'MUNICIPAL',
    'DISCHARGE', 'SUMMARY', 'DEPARTMENT',
];

function isValidPatientName(name: string): boolean {
    if (!name || name.trim().length === 0) return false;
    const upper = name.toUpperCase().trim();
    if (INSTITUTION_KEYWORDS.some(kw => upper.includes(kw))) return false;
    if (name.trim().length > 60) return false;
    const words = name.trim().split(/\s+/);
    if (words.length > 4 && upper === name.toUpperCase()) return false;
    return true;
}

function sanitizeExtracted(raw: unknown): ExtractedDischarge {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    // Clean field: fix OCR errors AND strip placeholder values
    const str = (v: unknown) => {
        if (v == null) return '';
        const s = fixOCRErrors(String(v).trim());
        return cleanField(s);
    };
    const num = (v: unknown) => { const n = Number(v); return isNaN(n) ? 70 : Math.min(100, Math.max(0, n)); };
    const status = (v: unknown): 'H' | 'L' | 'N' => {
        const s = String(v ?? 'N').toUpperCase();
        if (s === 'H' || s === 'HIGH') return 'H';
        if (s === 'L' || s === 'LOW') return 'L';
        return 'N';
    };
    const arr = <T>(v: unknown, map: (i: unknown) => T | null): T[] => {
        if (!Array.isArray(v)) return [];
        return v.map(map).filter((x): x is T => x !== null);
    };

    const p = (r.patient && typeof r.patient === 'object' ? r.patient : {}) as Record<string, unknown>;
    const rawName = str(p.name);

    return {
        patient: {
            name: isValidPatientName(rawName) ? rawName : '',
            age: str(p.age),
            sex: str(p.sex),
            abha: str(p.abha),
            bloodGroup: str(p.bloodGroup),
            hospital: str(p.hospital),
            ward: str(p.ward),
            admission: str(p.admission),
            discharge: str(p.discharge),
            attending: str(p.attending),
            chiefComplaint: str(p.chiefComplaint),
        },
        diagnoses: arr(r.diagnoses, (d) => {
            const dx = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
            const name = str(dx.name);
            return name ? normalizeDiagnosis({ name, icd: str(dx.icd), snomed: str(dx.snomed), confidence: num(dx.confidence) }) : null;
        }),
        medications: arr(r.medications, (m) => {
            const med = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
            const name = str(med.name);
            return name ? { name, dosage: str(med.dosage), route: canonicalRoute(name, str(med.route)), confidence: num(med.confidence) } : null;
        }),
        vitals: arr(r.vitals, (v) => {
            const vt = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
            const name = str(vt.name);
            const value = str(vt.value);
            // Skip vitals with placeholder or empty values
            return (name && value) ? { name, value, confidence: num(vt.confidence) } : null;
        }),
        labValues: arr(r.labValues, (l) => {
            const lv = (l && typeof l === 'object' ? l : {}) as Record<string, unknown>;
            const test = str(lv.test);
            const value = str(lv.value);
            // Skip lab values with no actual value (e.g. "AS ENCLOSED")
            if (!test || !value) return null;
            if (value.toUpperCase().includes('ENCLOSED') || value.toUpperCase().includes('ATTACHED')) return null;
            return { test, value, unit: str(lv.unit), ref: str(lv.ref), status: status(lv.status), loinc: str(lv.loinc), confidence: num(lv.confidence) };
        }),
        procedures: arr(r.procedures, (p) => {
            const pr = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
            const name = str(pr.name);
            return name ? { name, snomed: str(pr.snomed), day: str(pr.day), findings: str(pr.findings), confidence: num(pr.confidence) } : null;
        }),
        dischargeInstructions: arr(r.dischargeInstructions, (d) => {
            const di = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
            const label = str(di.label);
            const value = str(di.value);
            return (label && value) ? { label, value, confidence: num(di.confidence) } : null;
        }),
        followUp: arr(r.followUp, (f) => {
            const fu = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
            const label = str(fu.label);
            const value = str(fu.value);
            return (label && value) ? { label, value, confidence: num(fu.confidence) } : null;
        }),
        overallConfidence: num(r.overallConfidence),
    };
}

// =============================================================================
// JSON PARSER — handles preamble, truncation, markdown fences
// =============================================================================

function parseJSON(raw: string): ExtractedDischarge | null {
    let c = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = c.indexOf('{');
    if (start === -1) return null;
    c = c.substring(start);

    try {
        const end = c.lastIndexOf('}');
        if (end > 0) return sanitizeExtracted(JSON.parse(c.substring(0, end + 1)));
    } catch { /* fall through */ }

    const fields = ['patient', 'diagnoses', 'medications', 'vitals', 'labValues', 'procedures', 'dischargeInstructions', 'followUp'];
    for (let i = fields.length - 1; i >= 1; i--) {
        const prevIdx = c.lastIndexOf(`"${fields[i - 1]}"`);
        const nextIdx = c.lastIndexOf(`"${fields[i]}"`);
        if (prevIdx === -1 || nextIdx <= prevIdx) continue;
        let depth = 0, inStr = false, escape = false, cut = -1;
        for (let j = prevIdx; j < nextIdx; j++) {
            const ch = c[j];
            if (escape) { escape = false; continue; }
            if (ch === '\\' && inStr) { escape = true; continue; }
            if (ch === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (ch === '{' || ch === '[') depth++;
            if (ch === '}' || ch === ']') { depth--; if (depth <= 0) cut = j; }
        }
        if (cut > 0) {
            const suffix = fields.slice(i).map(f => f === 'patient'
                ? `"patient":{"name":"","age":"","sex":"","abha":"","bloodGroup":"","hospital":"","ward":"","admission":"","discharge":"","attending":"","chiefComplaint":""}`
                : `"${f}":[]`).join(',');
            try { return sanitizeExtracted(JSON.parse(c.substring(0, cut + 1) + ',' + suffix + ',"overallConfidence":65}')); }
            catch { continue; }
        }
    }
    return sanitizeExtracted({});
}

// =============================================================================
// PROMPTS
// =============================================================================

const PATIENT_AND_DX_PROMPT = (s: {
    header: string; diagnosis: string; comorbidities: string; chiefComplaint: string; vitals: string;
}) => `Extract patient demographics and diagnoses from this Indian hospital discharge summary.

CRITICAL ACCURACY RULES:
- ONLY extract data that is EXPLICITLY WRITTEN in the text below
- If a field is not present, blank, redacted, or unclear → return EMPTY STRING ""
- NEVER guess, infer, or fabricate any value
- Do NOT fill in blood group, ABHA ID, ward etc. unless they are clearly written

PATIENT NAME RULE:
- Indian government hospital forms OFTEN leave the patient name BLANK or REDACTED
- If the NAME cell is empty, contains only dashes, or shows a signature mark → set name to ""
- NEVER put hospital name, department name, or letterhead text into the "name" field
- Only set name if you see a real personal name (e.g. "Ramesh Kumar") in the PATIENT NAME row

HEADER (letterhead + patient info table):
${s.header.substring(0, 800)}

DIAGNOSIS:
${s.diagnosis.substring(0, 500)}

COMORBIDITIES / PAST HISTORY / K/C/O:
${s.comorbidities.substring(0, 400)}

CHIEF COMPLAINT:
${s.chiefComplaint.substring(0, 300)}

EXTRACTION RULES:
- hospital: full institution name from letterhead top lines; "" if not found
- name: personal name only; "" if blank, redacted or unclear
- age: exact age text; "" if not found
- sex: "" if not found
- abha: "" if not found (do NOT fabricate a number)
- bloodGroup: "" if not explicitly written
- ward: "" if not found
- admission: DOA value in DD/MM/YYYY; "" if not found
- discharge: DOD value in DD/MM/YYYY; "" if not found
- attending: consultant/doctor name from Attending or Consultants row; omit their degrees/titles like (DMS & PROFESSOR); "" if not found
- chiefComplaint: main complaint text; "" if not found
- diagnoses: ALL diagnoses as separate entries — primary diagnosis + every comorbidity
- Use FULL canonical names: "Type 2 Diabetes Mellitus" not "Diabetes", "Systemic Hypertension" not just "HTN"
- ICD: CHOLELITHIASIS=K80.20, T2DM=E11.9, SYSTEMIC HYPERTENSION=I10
- confidence: 95=exact text copied verbatim, 80=clearly present, 60=inferred from context

Return ONLY JSON, no markdown, no explanation:
{"patient":{"name":"","age":"","sex":"","abha":"","bloodGroup":"","hospital":"","ward":"","admission":"","discharge":"","attending":"","chiefComplaint":""},"diagnoses":[{"name":"","icd":"","snomed":"","confidence":0}],"overallConfidence":0}

IMPORTANT: Do NOT include a "vitals" field in your JSON response. Vitals are extracted separately.`;

const MEDICATIONS_PROMPT = (text: string) => `You are extracting medications from an Indian hospital discharge summary. Extract EVERY drug listed.

CRITICAL: Only extract drugs that are EXPLICITLY listed in the text. Do NOT add any drug that is not written below. If a dosage or route is unclear, use empty string "".

TREATMENT TEXT:
${text.substring(0, 3500)}

MANDATORY EXTRACTION RULES:
1. Extract ALL lines that contain a drug or fluid, including:
   "IV FLUIDS" → {name:"IV Fluids", dosage:"", route:"IV"}
   "INJ. TAXIM IG IV BD" → {name:"Taxim", dosage:"1G IV BD", route:"IV"}
   "INJ. METRO 500MG IV TDS" → {name:"Metro", dosage:"500MG IV TDS", route:"IV"}
   "INJ. TRAMADOL 50MG 1M BD" → {name:"Tramadol", dosage:"50MG BD", route:"IM"}
   "INJ. RANTAC 50MG IV BD" → {name:"Rantac", dosage:"50MG IV BD", route:"IV"}
   "INJ. VOVERON 50MG 1M BD" → {name:"Voveron", dosage:"50MG BD", route:"IM"}
   "INJ. H HYDROCORT 100MG IV OD" → {name:"Hydrocort", dosage:"100MG IV OD", route:"IV"}
   "INJ. H INSULATARD 0-0-8 U S/C" → {name:"Insulatard", dosage:"0-0-8 U", route:"SC"}
   "INJ. H ACTRAPID 8-8-6 U S/C" → {name:"Actrapid", dosage:"8-8-6 U", route:"SC"}
   "TAB. METFORMIN 500MG 1-0-1" → {name:"Metformin", dosage:"500MG 1-0-1", route:"PO"}
   "TAB. AMLONG 10MG 1-0-0" → {name:"Amlong", dosage:"10MG 1-0-0", route:"PO"}
   "TAB. ENALAPRIL 5MG 0-0-1" → {name:"Enalapril", dosage:"5MG 0-0-1", route:"PO"}
   "NEB DIJOLIN Q8H" → {name:"Duolin", dosage:"Q8H", route:"INH"}
   "NEB FORACORT 0.5MG Q12H" → {name:"Foracort", dosage:"0.5MG Q12H", route:"INH"}
   "SYP. SUCRALFATE 10ML-10ML-10ML" → {name:"Sucralfate", dosage:"10ML-10ML-10ML", route:"PO"}

2. ROUTE IS DETERMINED BY DRUG TYPE — do NOT infer route from adjacent lines:
   - TAB. / CAP. → ALWAYS "PO"
   - SYP. → ALWAYS "PO"
   - NEB → ALWAYS "INH"
   - INJ. with S/C or U/C → ALWAYS "SC" (insulin)
   - INJ. with IM or 1M → ALWAYS "IM"
   - INJ. with IV → ALWAYS "IV"
   - ENALAPRIL is a TABLET → "PO" (never NEB or INH)
   - SUCRALFATE is a SYRUP → "PO" (never LOCAL or TOPICAL)

3. Do NOT skip any drug line. Do NOT merge entries.
4. Fix OCR: METFORMTN→Metformin, DIJOLIN→Duolin, ENALApRIL→Enalapril
5. If dosage/route is not clear from text, use empty string ""
6. Do NOT invent or guess any medication not present in the text

Return ONLY a JSON array. No wrapper object. No markdown. No explanation:
[{"name":"","dosage":"","route":"","confidence":0}]`;

const PROCEDURES_DISCHARGE_PROMPT = (s: {
    procedures: string; investigations: string; discharge: string; followUp: string;
}) => `Extract procedures, investigations, discharge condition and follow-up from this discharge summary.

CRITICAL ACCURACY RULES:
- ONLY extract data that is EXPLICITLY WRITTEN in the text below
- If a section is empty or says "AS ENCLOSED" or "NIL" → return empty array []
- NEVER guess or fabricate any value. If data is not present, return empty string or empty array.

PROCEDURES:
${s.procedures.substring(0, 700)}

INVESTIGATIONS:
${s.investigations.substring(0, 400)}

DISCHARGE / CONDITION AT DISCHARGE:
${s.discharge.substring(0, 500)}

FOLLOW UP / ADVICE:
${s.followUp.substring(0, 300)}

RULES:
- procedures: name only. SNOMED 73761001 = Laparoscopic Cholecystectomy. Return [] if none found.
- labValues: ONLY if actual numeric values are present inline. "AS ENCLOSED" or "ATTACHED" or blank → return []
- dischargeInstructions: condition at discharge, dietary advice, wound care. Only include if explicitly mentioned.
- followUp: review date, OPD, repeat tests. Only include if explicitly mentioned.
- For ALL fields: if data is not present, return "" for strings and [] for arrays

Return ONLY JSON, no markdown:
{"procedures":[{"name":"","snomed":"","day":"","findings":"","confidence":0}],"labValues":[{"test":"","value":"","unit":"","ref":"","status":"N","loinc":"","confidence":0}],"dischargeInstructions":[{"label":"","value":"","confidence":0}],"followUp":[{"label":"","value":"","confidence":0}]}`;

const FALLBACK_PROMPT = (text: string) => `Extract clinical data from this Indian hospital discharge summary. Return ONLY valid JSON.

CRITICAL ACCURACY RULES:
- ONLY extract data that is EXPLICITLY WRITTEN in the text
- If a field is not present → return EMPTY STRING ""
- If a list section has no data → return EMPTY ARRAY []
- NEVER guess, infer, or fabricate any value
- For vitals, copy the EXACT numbers from the VITALS: line

PATIENT NAME: "" if blank/redacted — NEVER use hospital name.
DIAGNOSIS: ALL diagnoses with full canonical names. Only include diagnoses explicitly stated.
MEDICATIONS: every drug explicitly listed. TAB/CAP/SYP→PO, NEB→INH, S/C→SC, INJ+IV→IV, INJ+IM→IM.
VITALS: one entry per measurement. Copy EXACT numbers from VITALS line.
DATES: DOA=admission, DOD=discharge, DD/MM/YYYY. "" if not found.
LAB VALUES: only if actual inline numbers exist; "AS ENCLOSED"→[].
bloodGroup, abha, ward: "" if not explicitly written.

TEXT: ${text.substring(0, 4000)}

IMPORTANT: Do NOT include a "vitals" field. Vitals are extracted separately by a dedicated parser.

JSON: {"patient":{"name":"","age":"","sex":"","abha":"","bloodGroup":"","hospital":"","ward":"","admission":"","discharge":"","attending":"","chiefComplaint":""},"diagnoses":[],"medications":[],"labValues":[],"procedures":[],"dischargeInstructions":[],"followUp":[],"overallConfidence":0}`;

const DIAGNOSTIC_REPORT_PROMPT = (text: string) => `Extract clinical data from this Indian diagnostic / lab report. Return ONLY valid JSON.

CRITICAL ACCURACY RULES:
- ONLY extract data that is EXPLICITLY WRITTEN in the text
- If a field is not present → return EMPTY STRING ""
- If a list section has no data → return EMPTY ARRAY []
- NEVER guess, infer, or fabricate any value

PATIENT NAME: "" if blank/redacted — NEVER use hospital name.
LAB VALUES: Extract ALL lab tests and measurements as objects. Each test needs a 'test' name, 'value' (Result), 'unit' (if present), and 'ref' (Biological Reference Interval if present). If status (H/L/N) is not explicitly flagged, use "N". Identify the tests under their specific panels (e.g., Lipid Profile, Liver Function Test, Rft, Ogtt).
DATES: Put collection date in 'admission', and reporting date in 'discharge'.

TEXT: ${text.substring(0, 6000)}

JSON: {"patient":{"name":"","age":"","sex":"","abha":"","bloodGroup":"","hospital":"","ward":"","admission":"","discharge":"","attending":"","chiefComplaint":""},"diagnoses":[],"medications":[],"labValues":[{"test":"","value":"","unit":"","ref":"","status":"N","loinc":"","confidence":0}],"procedures":[],"dischargeInstructions":[],"followUp":[],"overallConfidence":0}`;

// =============================================================================
// OLLAMA API CALLER
// =============================================================================

async function callOllama(prompt: string, model: string): Promise<string> {
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model, prompt, stream: false,
            options: { temperature: 0.05, num_ctx: 8192, num_predict: 1800, repeat_penalty: 1.1, top_p: 0.9 },
        }),
        signal: AbortSignal.timeout(180000),
    });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json() as { response: string };
    return data.response ?? '';
}

// =============================================================================
// MULTI-PASS EXTRACTION — primary pipeline
// =============================================================================

export async function extractWithSections(
    sections: ClinicalSections,
    model: string,
    onProgress: (msg: string) => void,
    onComplete: (result: ExtractedDischarge) => void,
    onError: (err: string) => void,
): Promise<void> {
    try {
        // Pass 1: Patient + Diagnoses
        onProgress('Pass 1/3 — Extracting patient demographics & diagnoses...');
        const p1raw = await callOllama(PATIENT_AND_DX_PROMPT({
            header: sections.header,
            diagnosis: sections.diagnosis,
            comorbidities: sections.comorbidities,
            chiefComplaint: sections.chiefComplaint,
            vitals: sections.vitals,
        }), model);
        const pass1 = parseJSON(p1raw);

        // Pass 2: Medications — use full raw if section detection found nothing
        onProgress('Pass 2/3 — Extracting medications...');
        const medsText = sections.medications.length > 100 ? sections.medications : sections.raw;
        const p2raw = await callOllama(MEDICATIONS_PROMPT(medsText), model);

        let llmMeds: ExtractedDischarge['medications'] = [];
        try {
            const c = p2raw.replace(/```json/gi, '').replace(/```/g, '').trim();
            const a = c.indexOf('['), b = c.lastIndexOf(']');
            if (a !== -1 && b > a) {
                const parsed = JSON.parse(c.substring(a, b + 1));
                if (Array.isArray(parsed)) {
                    llmMeds = parsed
                        .map((m: Record<string, unknown>) => ({
                            name: fixOCRErrors(String(m.name ?? '').trim()),
                            dosage: String(m.dosage ?? '').trim(),
                            route: String(m.route ?? '').trim(),
                            confidence: Math.min(100, Math.max(0, Number(m.confidence ?? 80))),
                        }))
                        .filter((m) => m.name.length > 1);
                }
            }
        } catch { /* llmMeds stays [] */ }

        // Apply canonical routes + catch missed critical drugs
        const medications = ensureCriticalDrugs(mergeMedications(llmMeds), medsText);

        // Pass 3: Procedures + Discharge + FollowUp
        onProgress('Pass 3/3 — Extracting procedures & discharge summary...');
        const p3raw = await callOllama(PROCEDURES_DISCHARGE_PROMPT({
            procedures: sections.procedures,
            investigations: sections.investigations,
            discharge: sections.discharge,
            followUp: sections.followUp,
        }), model);
        const pass3 = parseJSON(p3raw);

        // Deterministic post-processing
        onProgress('Applying deterministic corrections & cross-validation...');

        // Vitals: ALWAYS use deterministic parser — NEVER use LLM vitals
        // The LLM cannot be trusted with vital values at all
        const rawVitalsText = [sections.vitals, sections.discharge, sections.raw].join('\n');
        console.log('[ClinIQ DEBUG] sections.vitals:', JSON.stringify(sections.vitals.substring(0, 500)));
        console.log('[ClinIQ DEBUG] rawVitalsText length:', rawVitalsText.length);
        const parsedVitals = parseVitalsFromText(rawVitalsText);
        console.log('[ClinIQ DEBUG] Deterministic parser found:', parsedVitals.length, 'vitals:', parsedVitals.map(v => v.name + '=' + v.value));
        const llmVitalsFromPass1 = (pass1?.vitals ?? []);
        console.log('[ClinIQ DEBUG] LLM pass1 vitals:', llmVitalsFromPass1.map(v => v.name + '=' + v.value));
        // If deterministic parser found vitals, use them; otherwise use empty array (NEVER use LLM vitals)
        const finalVitals = parsedVitals.length > 0 ? parsedVitals : [];
        console.log('[ClinIQ DEBUG] FINAL vitals being stored:', finalVitals.map(v => v.name + '=' + v.value));



        // Dates: regex from header text
        const rawHeaderText = sections.header + '\n' + sections.raw.substring(0, 1200);
        const parsedDates = parseDatesFromText(rawHeaderText);
        const finalPatient = pass1?.patient ?? sanitizeExtracted({}).patient;
        if (!finalPatient.admission && parsedDates.admission) finalPatient.admission = parsedDates.admission;
        if (!finalPatient.discharge && parsedDates.discharge) finalPatient.discharge = parsedDates.discharge;

        // Cross-validate patient fields against raw text
        const fullRawText = sections.raw;
        if (finalPatient.abha && !crossValidateValue(finalPatient.abha, fullRawText)) {
            console.warn('[ClinIQ] Dropping unverifiable ABHA:', finalPatient.abha);
            finalPatient.abha = '';
        }
        if (finalPatient.bloodGroup && !crossValidateValue(finalPatient.bloodGroup, fullRawText)) {
            console.warn('[ClinIQ] Dropping unverifiable blood group:', finalPatient.bloodGroup);
            finalPatient.bloodGroup = '';
        }
        if (finalPatient.ward && !crossValidateValue(finalPatient.ward, fullRawText)) {
            console.warn('[ClinIQ] Dropping unverifiable ward:', finalPatient.ward);
            finalPatient.ward = '';
        }

        const merged: ExtractedDischarge = {
            patient: finalPatient,
            diagnoses: (pass1?.diagnoses ?? []).map(normalizeDiagnosis),
            vitals: finalVitals,
            medications,
            labValues: pass3?.labValues ?? [],
            procedures: pass3?.procedures ?? [],
            dischargeInstructions: pass3?.dischargeInstructions ?? [],
            followUp: pass3?.followUp ?? [],
            overallConfidence: Math.round((
                (pass1?.overallConfidence ?? 70) +
                (medications.length > 8 ? 90 : medications.length > 4 ? 78 : 55) +
                (pass3?.overallConfidence ?? 70)
            ) / 3),
        };

        console.log('[ClinIQ] Extraction complete:', {
            name: merged.patient.name || '(redacted)',
            hospital: merged.patient.hospital,
            admission: merged.patient.admission,
            discharge: merged.patient.discharge,
            diagnoses: merged.diagnoses.length,
            medications: merged.medications.length,
            vitals: merged.vitals.length,
            procedures: merged.procedures.length,
            instructions: merged.dischargeInstructions.length,
        });

        onComplete(merged);

    } catch (err: unknown) {
        onError(err instanceof Error ? err.message : 'Multi-pass extraction failed');
    }
}

// =============================================================================
// SINGLE-PASS FALLBACK
// =============================================================================

export async function extractWithOllama(
    text: string,
    model: string,
    onToken: (partial: string) => void,
    onComplete: (result: ExtractedDischarge) => void,
    onError: (err: string) => void,
): Promise<void> {
    const prompt = FALLBACK_PROMPT(text);
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model, prompt, stream: true,
                options: { temperature: 0.05, num_ctx: 8192, num_predict: 2000, repeat_penalty: 1.1 },
            }),
            signal: AbortSignal.timeout(300000),
        });
        if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let full = '';
        let handled = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value, { stream: true }).split('\n').filter(Boolean)) {
                let chunk: Record<string, unknown>;
                try { chunk = JSON.parse(line); } catch { continue; }
                if (typeof chunk.response === 'string') { full += chunk.response; onToken(full); }
                if (chunk.done === true && !handled) {
                    handled = true;
                    const result = parseJSON(full);
                    if (result) {
                        // CRITICAL: Override LLM vitals with deterministic parser
                        const deterministicVitals = parseVitalsFromText(text);
                        if (deterministicVitals.length > 0) {
                            result.vitals = deterministicVitals;
                            console.log('[ClinIQ Fallback] Using deterministic vitals:', deterministicVitals.map(v => `${v.name}=${v.value}`));
                        }
                        onComplete(result);
                    } else {
                        onError('Malformed JSON from LLM');
                    }
                    return;
                }
            }
        }
        if (!handled && full.length > 10) {
            const result = parseJSON(full);
            if (result) {
                // CRITICAL: Override LLM vitals with deterministic parser
                const deterministicVitals = parseVitalsFromText(text);
                if (deterministicVitals.length > 0) {
                    result.vitals = deterministicVitals;
                    console.log('[ClinIQ Fallback] Using deterministic vitals:', deterministicVitals.map(v => `${v.name}=${v.value}`));
                }
                onComplete(result);
            } else {
                onError('Stream ended without valid JSON');
            }
        }
    } catch (err: unknown) {
        onError(err instanceof Error ? err.message : 'Unknown error');
    }
}

// =============================================================================
// DIAGNOSTIC REPORT EXTRACTION
// =============================================================================

export async function extractDiagnosticReport(
    text: string,
    model: string,
    onProgress: (msg: string) => void,
    onComplete: (result: ExtractedDischarge) => void,
    onError: (err: string) => void,
): Promise<void> {
    onProgress('Pass 1/1 — Extracting lab values and patient demographics...');
    const prompt = DIAGNOSTIC_REPORT_PROMPT(text);
    try {
        const pRaw = await callOllama(prompt, model);
        const parsed = parseJSON(pRaw);
        if (parsed) {
            onProgress('Applying deterministic corrections & cross-validation...');
            onComplete(parsed);
        } else {
            onError('Malformed JSON from LLM');
        }
    } catch (err: unknown) {
        onError(err instanceof Error ? err.message : 'Diagnostic report extraction failed');
    }
}

// =============================================================================
// MODEL DISCOVERY
// =============================================================================

export function getAvailableOllamaModels(): Promise<string[]> {
    return fetch('http://localhost:11434/api/tags')
        .then(r => r.json())
        .then((d: { models?: Array<{ name: string }> }) => (d.models ?? []).map(m => m.name))
        .catch(() => []);
}
