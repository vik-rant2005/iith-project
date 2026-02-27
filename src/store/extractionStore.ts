import { ExtractedDischarge } from '@/lib/ollamaExtractor';

interface ExtractionStore {
    uploadedFile: File | null;
    extractedData: ExtractedDischarge | null;
    isExtracting: boolean;
    extractionProgress: string;
    error: string | null;
    model: string;
}

export type StoreSnapshot = {
    extractedData: ExtractedDischarge | null;
    isExtracting: boolean;
    extractionProgress: string;
    error: string | null;
    model: string;
    uploadedFileName: string | null;
};

// Module-level singleton
const store: ExtractionStore = {
    uploadedFile: null,
    extractedData: null,
    isExtracting: false,
    extractionProgress: '',
    error: null,
    model: 'llama3.2:3b',
};

// ── Stable snapshot cache ──────────────────────────────────────────────────
// useSyncExternalStore REQUIRES getStore() to return the SAME object reference
// between renders when nothing changed. If we always return { ...store },
// React sees a new reference every call → infinite re-render loop.
// We rebuild the snapshot only inside notify(), so the reference is stable
// between renders and only changes when the store actually mutates.
let snapshot: StoreSnapshot = {
    extractedData: null,
    isExtracting: false,
    extractionProgress: '',
    error: null,
    model: 'llama3.2:3b',
    uploadedFileName: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

function rebuildSnapshot() {
    snapshot = {
        extractedData: store.extractedData,
        isExtracting: store.isExtracting,
        extractionProgress: store.extractionProgress,
        error: store.error,
        model: store.model,
        uploadedFileName: store.uploadedFile?.name ?? null,
    };
}

function notify() {
    rebuildSnapshot();
    listeners.forEach((fn) => fn());
}

// getStore must return a stable reference between renders —
// only a new object when the store has actually changed (after notify).
export function getStore(): StoreSnapshot {
    return snapshot;
}

export function getUploadedFile(): File | null {
    return store.uploadedFile;
}

export function setUploadedFile(file: File) {
    store.uploadedFile = file;
    notify();
}

export function setExtracting(v: boolean) {
    store.isExtracting = v;
    notify();
}

// ── Throttled progress updates ────────────────────────────────────────────
// Streaming tokens fire 100s of times/sec. Notifying React on every token
// causes a render flood → "Maximum update depth exceeded".
// We batch progress updates to at most once per 500ms.
let progressTimer: ReturnType<typeof setTimeout> | null = null;

export function setExtractionProgress(v: string) {
    store.extractionProgress = v;
    if (progressTimer) return; // already a pending update — skip
    progressTimer = setTimeout(() => {
        progressTimer = null;
        rebuildSnapshot();
        listeners.forEach((fn) => fn());
    }, 500);
}

export function setExtractedData(data: ExtractedDischarge) {
    if (progressTimer) {
        clearTimeout(progressTimer);
        progressTimer = null;
    }
    store.extractedData = data;
    store.isExtracting = false;
    store.extractionProgress = '';
    store.error = null;
    notify();
}

export function setError(err: string) {
    if (progressTimer) {
        clearTimeout(progressTimer);
        progressTimer = null;
    }
    store.error = err;
    store.isExtracting = false;
    notify();
}

export function setModel(m: string) {
    store.model = m;
    notify();
}

export function clearExtraction() {
    if (progressTimer) {
        clearTimeout(progressTimer);
        progressTimer = null;
    }
    store.uploadedFile = null;
    store.extractedData = null;
    store.isExtracting = false;
    store.extractionProgress = '';
    store.error = null;
    notify();
}
