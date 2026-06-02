import { useGetAdminReports } from "@workspace/api-client-react";
import { FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

function hostOf(url?: string | null): string {
  if (!url) return "—";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function AdminReports() {
  const { data: reports, isLoading } = useGetAdminReports({ query: { queryKey: ["admin-reports"] } });

  if (isLoading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] overflow-hidden">
      {(reports ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No reports generated yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70 border-b border-white/8">
                <th className="text-left font-normal p-4">Company</th>
                <th className="text-left font-normal p-4">Target</th>
                <th className="text-left font-normal p-4">Plan</th>
                <th className="text-left font-normal p-4">Date</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {(reports ?? []).map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-foreground/90">{r.companyName ?? "—"}</td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{hostOf(r.websiteUrl)}</td>
                  <td className="p-4 capitalize text-muted-foreground text-xs">{r.plan ?? "—"}</td>
                  <td className="p-4 font-mono text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy")}</td>
                  <td className="p-4 text-right">
                    {r.pdfUrl ? (
                      <a href={r.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">No file</span>
                    )}
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
