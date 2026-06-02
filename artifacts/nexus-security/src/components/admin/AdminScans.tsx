import { useState } from "react";
import {
  useGetAdminScans,
  useUpdateScanStatus,
  useReassignScan,
  useUploadScanReport,
  useDeleteScan,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Loader2, ScanLine } from "lucide-react";
import { format } from "date-fns";

const STATUSES = ["pending", "queued", "running", "completed", "failed"];

function statusColor(s: string): string {
  switch (s) {
    case "completed": return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    case "running": case "queued": return "text-primary border-primary/30 bg-primary/10";
    case "failed": return "text-destructive border-destructive/30 bg-destructive/10";
    default: return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  }
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function AdminScans() {
  const { data: scans, isLoading, refetch } = useGetAdminScans({ query: { queryKey: ["admin-scans"] } });
  const updateStatus = useUpdateScanStatus();
  const reassign = useReassignScan();
  const uploadReport = useUploadScanReport();
  const deleteScan = useDeleteScan();
  const { toast } = useToast();
  const [reportUrls, setReportUrls] = useState<Record<string, string>>({});

  const setStatus = async (scanId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ scanId, data: { status } });
      toast({ title: "Status updated" });
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const doReassign = async (scanId: string, value: string) => {
    const userId = parseInt(value, 10);
    if (isNaN(userId)) return;
    try {
      await reassign.mutateAsync({ scanId, data: { userId } });
      toast({ title: "Scan reassigned" });
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const doUpload = async (scanId: string) => {
    const pdfUrl = (reportUrls[scanId] || "").trim();
    if (!pdfUrl) return;
    try {
      await uploadReport.mutateAsync({ scanId, data: { pdfUrl } });
      toast({ title: "Report attached" });
      setReportUrls((p) => ({ ...p, [scanId]: "" }));
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const doDelete = async (scanId: string) => {
    try {
      await deleteScan.mutateAsync({ scanId });
      toast({ title: "Scan deleted" });
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] overflow-hidden">
      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : (scans ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <ScanLine className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No scans found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70 border-b border-white/8">
                <th className="text-left font-normal p-4">Target</th>
                <th className="text-left font-normal p-4">Owner</th>
                <th className="text-left font-normal p-4">Plan</th>
                <th className="text-left font-normal p-4">Status</th>
                <th className="text-left font-normal p-4">Report</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {(scans ?? []).map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4">
                    <div className="text-foreground/90">{s.companyName ?? hostOf(s.websiteUrl)}</div>
                    <div className="font-mono text-xs text-muted-foreground">{hostOf(s.websiteUrl)}</div>
                    <div className="font-mono text-[10px] text-muted-foreground/50">{format(new Date(s.createdAt), "MMM d, yyyy")}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-foreground/80">{s.userName ?? "Unassigned"}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{s.userEmail ?? "—"}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        placeholder="User ID"
                        className="w-20 h-6 text-[10px] font-mono px-1.5 bg-black/50"
                        onKeyDown={(e) => { if (e.key === "Enter") doReassign(s.id, (e.target as HTMLInputElement).value); }}
                      />
                      <span className="text-[9px] text-muted-foreground/50">↵ reassign</span>
                    </div>
                  </td>
                  <td className="p-4 capitalize text-xs text-muted-foreground">{s.plan}</td>
                  <td className="p-4">
                    <select value={s.status} onChange={(e) => setStatus(s.id, e.target.value)} className={`h-7 rounded bg-black/50 border px-2 text-xs capitalize ${statusColor(s.status)}`}>
                      {STATUSES.map((st) => <option key={st} value={st} className="bg-black text-foreground">{st}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    {s.reportUrl ? (
                      <a href={s.reportUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">View</a>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="PDF URL"
                          className="w-28 h-6 text-[10px] font-mono px-1.5 bg-black/50"
                          value={reportUrls[s.id] || ""}
                          onChange={(e) => setReportUrls((p) => ({ ...p, [s.id]: e.target.value }))}
                        />
                        <Button size="icon" variant="outline" className="h-6 w-6 border-primary/40 text-primary hover:bg-primary/10" onClick={() => doUpload(s.id)}>
                          <Upload className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Button size="icon" variant="outline" className="h-7 w-7 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => doDelete(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
