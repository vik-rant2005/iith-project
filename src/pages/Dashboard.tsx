import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Upload, FileText, Activity, Clock, TrendingUp, Check, AlertCircle,
  ChevronRight, Eye, Download, Trash2, ToggleLeft, ToggleRight, Zap
} from "lucide-react";
import { mockRecentJobs, downloadMockFHIRBundle } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { extractPDFWithFallback, combinePagesForLLM } from '@/lib/pdfExtractor';
import { extractWithOllama, extractWithSections, getAvailableOllamaModels, extractDiagnosticReport } from '@/lib/ollamaExtractor';
import { setUploadedFile, setExtracting, setExtractionProgress, setExtractedData, setError, setModel } from '@/store/extractionStore';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function StatChip({ icon: Icon, label, value, delay }: { icon: any; label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface card-shadow pulse-glow"
    >
      <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="text-h3 text-foreground">{value}</div>
        <div className="text-caption text-muted-foreground">{label}</div>
      </div>
    </motion.div>
  );
}

function UploadCard({ title, description, onUpload }: { title: string; description: string; onUpload: (file?: File) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setUploaded(true);
      setFileName(file.name);
      setFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
      setTimeout(() => onUpload(file), 300);
    }
  }, [onUpload]);

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploaded(true);
        setFileName(file.name);
        setFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');
        setTimeout(() => onUpload(file), 300);
      }
    };
    input.click();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={handleClick}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      className={`relative min-h-[200px] rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200 overflow-hidden ${uploaded
        ? "border-success bg-success/5"
        : isDragging
          ? "border-primary bg-surface-elevated"
          : "border-border hover:border-primary/60 bg-surface"
        }`}
      style={{
        background: !uploaded
          ? `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, hsl(243 76% 59% / 0.05), transparent 50%), hsl(var(--surface))`
          : undefined,
      }}
    >
      <div className="absolute inset-0 card-shadow rounded-lg pointer-events-none" />
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
        {uploaded ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-success" />
            </div>
            <span className="text-body text-foreground font-medium">{fileName || 'DS_RahulSharma_Feb2026.pdf'}</span>
            <span className="text-caption text-muted-foreground">{fileSize || '2.4 MB'}</span>
          </motion.div>
        ) : (
          <>
            <motion.div animate={isDragging ? { scale: 1.1 } : { scale: 1 }} transition={{ type: "spring" }}>
              <Upload className="w-10 h-10 text-muted-foreground" />
            </motion.div>
            <div className="text-h3 text-foreground">{title}</div>
            <div className="text-caption text-muted-foreground">{description}</div>
            <div className="text-caption text-primary mt-1">Drop file or click to browse</div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function PipelineTracker({ active }: { active: number }) {
  const stages = [
    { icon: FileText, label: "Classifying", sub: "Identifying document type..." },
    { icon: Activity, label: "Parsing", sub: "Reading clinical sections..." },
    { icon: Zap, label: "Extracting", sub: "Pulling entities & codes..." },
    { icon: TrendingUp, label: "Building FHIR", sub: "Constructing R4 bundle..." },
    { icon: Check, label: "Validating", sub: "NHCX profile checks..." },
  ];

  return (
    <div className="flex items-start justify-between gap-2 mt-8 px-4">
      {stages.map((stage, i) => {
        const isActive = i === active;
        const isDone = i < active;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center text-center flex-1">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-all ${isDone ? "bg-success/20" : isActive ? "bg-primary/20 glow-shadow" : "bg-muted"
                }`}>
                {isDone ? (
                  <Check className="w-5 h-5 text-success" />
                ) : (
                  <stage.icon className={`w-5 h-5 ${isActive ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                )}
              </div>
              <span className={`text-caption font-medium ${isActive ? "text-primary" : isDone ? "text-success" : "text-muted-foreground"}`}>
                {stage.label}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{stage.sub}</span>
            </div>
            {i < stages.length - 1 && (
              <div className="w-full h-px bg-border relative mx-2 mt-5">
                {isDone && <div className="absolute inset-0 bg-success" />}
                {isActive && (
                  <motion.div
                    className="absolute top-[-2px] w-2 h-2 rounded-full bg-primary"
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getConfidenceColor(c: number) {
  if (c >= 90) return "text-success";
  if (c >= 70) return "text-warning";
  return "text-destructive";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState(mockRecentJobs);
  const [claimMode, setClaimMode] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [pipelineStage, setPipelineStage] = useState(-1);

  const handleUpload = async (file?: File, docType: 'discharge' | 'diagnostic' = 'discharge') => {
    setUploaded(true);
    setPipelineStage(0);

    // If no real file provided, use demo mode
    if (!file) {
      let stage = 0;
      const interval = setInterval(() => {
        stage++;
        if (stage >= 5) { clearInterval(interval); setTimeout(() => navigate('/review'), 600); }
        else setPipelineStage(stage);
      }, 800);
      return;
    }

    // Real file: store it and begin extraction
    setUploadedFile(file);
    setExtracting(true);

    try {
      setPipelineStage(0); // Classifying

      // ── PDF Extraction with OCR fallback ──
      const extraction = await extractPDFWithFallback(file, (message) => {
        setExtractionProgress(message);
      }, docType);

      if (extraction.mode === 'failed' || extraction.charCount < 50) {
        const reason = 'Could not extract readable text from this PDF even with OCR. The file may be corrupted or use an unsupported format.';
        setError(reason);
        toast({ title: 'Extraction failed', description: reason, variant: 'destructive' });
        setPipelineStage(-1);
        setUploaded(false);
        setExtracting(false);
        return;
      }

      const modeLabel = extraction.mode === 'ocr' ? 'OCR' : 'text layer';
      toast({
        title: `Text extracted via ${modeLabel}`,
        description: `${extraction.charCount} chars from ${extraction.pageCount} page(s). Running AI extraction...`,
      });

      setPipelineStage(1); // Parsing

      // ── Model selection ──
      const models = await getAvailableOllamaModels();
      console.log('Available Ollama models:', models);
      const preferredModels = ['llama3.1:8b', 'llama3.2:3b', 'llama3:8b', 'llama3', 'mistral', 'phi3', 'gemma'];
      const chosenModel =
        models.find(m => preferredModels.some(p => m.toLowerCase().includes(p)))
        ?? models[0]
        ?? 'llama3.2:3b';
      setModel(chosenModel);

      setPipelineStage(2); // Extracting

      // Multi-pass extraction using detected sections
      const sections = extraction.sections;
      const hasSections = sections.medications.length > 50 || sections.diagnosis.length > 10;

      if (docType === 'diagnostic') {
        const fullText = combinePagesForLLM(extraction.pages, 6000);
        await extractDiagnosticReport(
          fullText, chosenModel,
          (msg) => setExtractionProgress(`[${modeLabel.toUpperCase()}] ${msg}`),
          (result) => {
            setPipelineStage(4);
            setExtractedData(result);
            toast({
              title: `✓ Diagnostic extraction complete`,
              description: `${result.labValues.length} lab values, ${result.diagnoses.length} diagnoses`,
            });
            setTimeout(() => navigate('/review'), 1200);
          },
          (err) => {
            setError(err);
            toast({ title: 'AI extraction failed', description: err, variant: 'destructive' });
            setPipelineStage(-1);
            setUploaded(false);
            setExtracting(false);
          }
        );
      } else if (hasSections) {
        // Use professional multi-pass approach
        await extractWithSections(
          sections,
          chosenModel,
          (msg) => {
            setExtractionProgress(`[${modeLabel.toUpperCase()}] ${msg}`);
            if (msg.includes('Pass 2')) setPipelineStage(3);
            if (msg.includes('Assembling')) setPipelineStage(4);
          },
          (result) => {
            setPipelineStage(4);
            setExtractedData(result);
            toast({
              title: `✓ Multi-pass extraction complete`,
              description: `${result.diagnoses.length} diagnoses, ${result.medications.length} medications, ${result.vitals.length} vitals`,
            });
            setTimeout(() => navigate('/review'), 1200);
          },
          (err) => {
            setError(err);
            toast({ title: 'AI extraction failed', description: err, variant: 'destructive' });
            setPipelineStage(-1);
            setUploaded(false);
            setExtracting(false);
          }
        );
      } else {
        // Fallback: single-pass with full raw text
        const fullText = combinePagesForLLM(extraction.pages, 6000);
        await extractWithOllama(
          fullText, chosenModel,
          (partial) => setExtractionProgress(`[${modeLabel.toUpperCase()}] ${partial.substring(0, 200)}`),
          (result) => {
            setPipelineStage(4);
            setExtractedData(result);
            toast({ title: '✓ Extraction complete', description: `${result.medications.length} medications extracted` });
            setTimeout(() => navigate('/review'), 1200);
          },
          (err) => {
            setError(err);
            toast({ title: 'AI extraction failed', description: err, variant: 'destructive' });
            setPipelineStage(-1); setUploaded(false); setExtracting(false);
          }
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setExtracting(false);
      toast({ title: 'Processing failed', description: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="min-h-[280px] flex flex-col justify-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-display gradient-text mb-3"
        >
          Turn Clinical PDFs into FHIR — Instantly
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-body text-muted-foreground max-w-xl mb-6"
        >
          Upload discharge summaries and diagnostic reports. Get ABDM/NHCX-compliant FHIR R4 bundles in seconds.
        </motion.p>
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex gap-4 flex-wrap">
          <StatChip icon={FileText} label="Documents Processed" value="3,841" delay={0} />
          <StatChip icon={TrendingUp} label="Avg Confidence" value="91%" delay={0.05} />
          <StatChip icon={Clock} label="Avg Processing Time" value="38s" delay={0.1} />
        </motion.div>
      </section>

      {/* Upload Zone */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UploadCard
            title="Discharge Summary"
            description="Hospital discharge summary PDF"
            onUpload={(file) => handleUpload(file, 'discharge')}
          />
          <UploadCard
            title="Diagnostic Report"
            description="Lab / imaging diagnostic report PDF"
            onUpload={(file) => handleUpload(file, 'diagnostic')}
          />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setClaimMode(!claimMode)}
            className="flex items-center gap-2 text-caption text-muted-foreground hover:text-foreground transition-colors"
          >
            {claimMode ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5" />}
            <span>Claim Bundle Mode</span>
          </button>
          {claimMode && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-caption text-primary">
              Both files will merge into one FHIR transaction bundle
            </motion.span>
          )}
        </div>
      </section>

      {/* Detection banner */}
      {uploaded && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface card-shadow"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-body text-foreground">Detected: <strong>Discharge Summary</strong> — 98% confidence</span>
          <AlertCircle className="w-4 h-4 text-muted-foreground ml-auto cursor-help" />
        </motion.div>
      )}

      {/* Pipeline */}
      {pipelineStage >= 0 && <PipelineTracker active={pipelineStage} />}

      {/* Recent Jobs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 text-foreground">Recent Conversions</h2>
          <button onClick={() => navigate('/history')} className="text-xs text-primary hover:text-primary/80 transition-colors">View all →</button>
        </div>
        <div className="rounded-lg card-shadow overflow-hidden">
          <table className="w-full text-body">
            <thead>
              <tr className="bg-surface-elevated text-muted-foreground text-caption text-left">
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Detected</th>
                <th className="px-4 py-3 font-medium">Confidence</th>
                <th className="px-4 py-3 font-medium">Health Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <motion.tr
                  key={job.id}
                  whileHover={{ x: 1, backgroundColor: "hsl(224 42% 14% / 0.5)" }}
                  className="border-t border-border transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">{job.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${job.type === "Discharge Summary" ? "bg-primary/20 text-primary" : "bg-primary-glow/20 text-primary-glow"
                      }`}>
                      {job.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{job.detected}</td>
                  <td className={`px-4 py-3 font-mono font-medium ${getConfidenceColor(job.confidence)}`}>{job.confidence}%</td>
                  <td className="px-4 py-3 font-mono">{job.healthScore > 0 ? `${job.healthScore}/100` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${job.status === "Completed" ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                      }`}>
                      {job.status === "Processing" && <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); navigate('/review'); }} className="text-muted-foreground hover:text-foreground transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); downloadMockFHIRBundle(job.patient); toast({ title: 'Downloading FHIR bundle', description: job.name }); }} className="text-muted-foreground hover:text-foreground transition-colors"><Download className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setJobs(prev => prev.filter(j => j.id !== job.id)); toast({ title: 'Record removed', description: `${job.name} deleted.` }); }} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
