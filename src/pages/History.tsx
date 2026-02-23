import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Download, FileSearch, Eye, Trash2, ChevronLeft, ChevronRight,
    X, ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { mockRecentJobs, downloadMockFHIRBundle, generateMockCSV, downloadCSV } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

/* ── Types ── */

type StatusType = "Completed" | "Processing" | "Failed";
type TypeFilter = "All" | "Discharge Summary" | "Diagnostic Report";
type StatusFilter = "All" | StatusType;
type DateFilter = "week" | "month" | "all";

/* ── Status Badge ── */

function StatusBadge({ status }: { status: StatusType }) {
    const styles: Record<StatusType, string> = {
        Completed: "bg-[#10B981]/20 text-[#10B981]",
        Processing: "bg-[#F59E0B]/20 text-[#F59E0B]",
        Failed: "bg-[#F43F5E]/20 text-[#F43F5E]",
    };
    return (
        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status]}`}>
            {status === "Processing" && <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />}
            {status}
        </span>
    );
}

/* ── Type Badge ── */

function TypeBadge({ type }: { type: string }) {
    const isDS = type === "Discharge Summary";
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isDS ? "bg-[#4F46E5]/20 text-[#4F46E5]" : "bg-purple-500/20 text-purple-400"
            }`}>
            {isDS ? "Discharge Summary" : "Diagnostic Report"}
        </span>
    );
}

/* ── Main Component ── */

export default function History() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [jobs, setJobs] = useState(mockRecentJobs);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
    const [dateFilter, setDateFilter] = useState<DateFilter>("all");
    const [selectedJob, setSelectedJob] = useState<typeof mockRecentJobs[0] | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    const filtered = useMemo(() => {
        return jobs.filter((job) => {
            if (search && !job.name.toLowerCase().includes(search.toLowerCase()) && !job.patient.toLowerCase().includes(search.toLowerCase())) return false;
            if (typeFilter !== "All" && job.type !== typeFilter) return false;
            if (statusFilter !== "All" && job.status !== statusFilter) return false;
            return true;
        });
    }, [jobs, search, typeFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, typeFilter, statusFilter]);

    const handleExportCSV = () => {
        const csv = generateMockCSV(filtered);
        downloadCSV(csv, 'ClinIQ_Conversion_History.csv');
        toast({ title: 'CSV exported', description: `${filtered.length} records exported.` });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl text-[#F1F5F9] font-bold">Conversion History</h1>
                    <p className="text-sm text-[#94A3B8] mt-1">Browse and manage all clinical document conversions</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by patient name or filename..."
                            className="pl-10 pr-4 py-2 w-72 rounded-md bg-[#0F1629] border border-[#1E2A45] text-sm text-[#F1F5F9] placeholder:text-[#94A3B8]/60 focus:border-[#4F46E5] focus:outline-none transition-colors"
                        />
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1E2A45] transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </motion.button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="flex rounded-md border border-[#1E2A45] overflow-hidden">
                    {(["All", "Discharge Summary", "Diagnostic Report"] as TypeFilter[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 text-xs transition-colors ${typeFilter === t ? "bg-[#4F46E5] text-white" : "bg-[#0F1629] text-[#94A3B8] hover:text-[#F1F5F9]"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                    <SelectTrigger className="w-36 h-8 text-xs bg-[#0F1629] border-[#1E2A45] text-[#F1F5F9]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151D35] border-[#1E2A45]">
                        {(["All", "Completed", "Processing", "Failed"] as StatusFilter[]).map((s) => (
                            <SelectItem key={s} value={s} className="text-[#F1F5F9] text-xs">{s}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                    <SelectTrigger className="w-36 h-8 text-xs bg-[#0F1629] border-[#1E2A45] text-[#F1F5F9]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#151D35] border-[#1E2A45]">
                        <SelectItem value="week" className="text-[#F1F5F9] text-xs">This week</SelectItem>
                        <SelectItem value="month" className="text-[#F1F5F9] text-xs">This month</SelectItem>
                        <SelectItem value="all" className="text-[#F1F5F9] text-xs">All time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Data Table */}
            {paginated.length > 0 ? (
                <div className="rounded-lg bg-[#0F1629] card-shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-[#151D35] text-[#94A3B8] text-left">
                                    <th className="px-4 py-3 font-medium">Document</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Patient</th>
                                    <th className="px-4 py-3 font-medium">Detected</th>
                                    <th className="px-4 py-3 font-medium">Confidence</th>
                                    <th className="px-4 py-3 font-medium">Health Score</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((job, i) => (
                                    <motion.tr
                                        key={job.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        onClick={() => setSelectedJob(job)}
                                        className="border-t border-[#1E2A45] cursor-pointer hover:bg-[#151D35] transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="text-[#F1F5F9] font-medium">{job.name}</div>
                                            <div className="text-[10px] text-[#94A3B8]">{job.size}</div>
                                        </td>
                                        <td className="px-4 py-3"><TypeBadge type={job.type} /></td>
                                        <td className="px-4 py-3">
                                            <div className="text-[#F1F5F9]">{job.patient}</div>
                                            <div className="text-[10px] text-[#94A3B8] font-mono">{job.abha}</div>
                                        </td>
                                        <td className="px-4 py-3 text-[#94A3B8]">{job.detected}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-medium ${job.confidence >= 90 ? "text-[#10B981]" : job.confidence >= 80 ? "text-[#F59E0B]" : "text-[#F43F5E]"
                                                    }`}>
                                                    {job.confidence}%
                                                </span>
                                                <div className="w-16 h-1 rounded-full bg-[#1E2A45] overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${job.confidence >= 90 ? "bg-[#10B981]" : job.confidence >= 80 ? "bg-[#F59E0B]" : "bg-[#F43F5E]"
                                                            }`}
                                                        style={{ width: `${job.confidence}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {job.healthScore > 0 ? (
                                                <span className={`font-medium ${job.healthScore >= 90 ? "text-[#10B981]" : job.healthScore >= 70 ? "text-[#F59E0B]" : "text-[#F43F5E]"
                                                    }`}>
                                                    {job.healthScore}/100
                                                </span>
                                            ) : (
                                                <span className="text-[#94A3B8]">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                                    className="p-1 rounded hover:bg-[#1E2A45] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
                                                    title="View"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); downloadMockFHIRBundle(job.patient); toast({ title: 'Downloading FHIR bundle', description: job.name }); }}
                                                    className="p-1 rounded hover:bg-[#1E2A45] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setJobs(prev => prev.filter(j => j.id !== job.id)); toast({ title: 'Record removed', description: `${job.name} deleted.` }); }}
                                                    className="p-1 rounded hover:bg-[#F43F5E]/20 text-[#94A3B8] hover:text-[#F43F5E] transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E2A45]">
                        <span className="text-xs text-[#94A3B8]">Showing {Math.min((currentPage - 1) * pageSize + 1, filtered.length)}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} results</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs text-[#F1F5F9]">Page {currentPage} of {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage >= totalPages}
                                className="p-1 rounded text-[#94A3B8] hover:text-[#F1F5F9] disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-20 rounded-lg bg-[#0F1629] card-shadow">
                    <FileSearch className="w-12 h-12 text-[#94A3B8]/40 mb-4" />
                    <div className="text-lg text-[#F1F5F9] font-medium mb-2">No conversions found</div>
                    <div className="text-sm text-[#94A3B8] mb-4">Try adjusting your search or filters</div>
                    <button
                        onClick={() => { setSearch(""); setTypeFilter("All"); setStatusFilter("All"); }}
                        className="px-4 py-2 rounded-md text-sm text-[#4F46E5] hover:bg-[#4F46E5]/10 transition-colors"
                    >
                        Clear search
                    </button>
                </div>
            )}

            {/* Detail Sheet */}
            <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
                <SheetContent className="bg-[#0F1629] border-l border-[#1E2A45] text-[#F1F5F9]">
                    <SheetHeader>
                        <SheetTitle className="text-[#F1F5F9]">Conversion Details</SheetTitle>
                    </SheetHeader>
                    {selectedJob && (
                        <div className="mt-6 space-y-4">
                            <div className="rounded-md bg-[#080D1A] border border-[#1E2A45] p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">Document</span>
                                    <span className="text-sm text-[#F1F5F9] font-medium">{selectedJob.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">Patient</span>
                                    <span className="text-sm text-[#F1F5F9]">{selectedJob.patient}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">ABHA ID</span>
                                    <span className="text-sm text-[#F1F5F9] font-mono">{selectedJob.abha}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">Type</span>
                                    <TypeBadge type={selectedJob.type} />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">Status</span>
                                    <StatusBadge status={selectedJob.status} />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">Confidence</span>
                                    <span className={`text-sm font-medium ${selectedJob.confidence >= 90 ? "text-[#10B981]" : "text-[#F59E0B]"
                                        }`}>{selectedJob.confidence}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">Health Score</span>
                                    <span className="text-sm text-[#F1F5F9]">{selectedJob.healthScore > 0 ? `${selectedJob.healthScore}/100` : "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">Size</span>
                                    <span className="text-sm text-[#F1F5F9]">{selectedJob.size}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-[#94A3B8]">Processed</span>
                                    <span className="text-sm text-[#F1F5F9]">{selectedJob.detected}</span>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { setSelectedJob(null); navigate("/review"); }}
                                className="shimmer-btn flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-md bg-[#4F46E5] text-white text-sm font-medium"
                            >
                                Open Full Review <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </motion.div>
    );
}
