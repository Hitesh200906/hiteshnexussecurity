import { useGetAuditLogs } from "@workspace/api-client-react";
import { ScrollText, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function AdminAuditLogs() {
  const { data: logs, isLoading } = useGetAuditLogs({ query: { queryKey: ["audit-logs"] } });

  if (isLoading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] overflow-hidden">
      {(logs ?? []).length === 0 ? (
        <div className="py-16 text-center">
          <ScrollText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 max-h-[640px] overflow-y-auto">
          {(logs ?? []).map((log) => (
            <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-white/5">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground font-mono">{log.action}</span>
                  {log.targetType && (
                    <span className="text-[10px] font-mono uppercase tracking-wide border border-white/15 rounded px-1.5 py-0.5 text-muted-foreground">
                      {log.targetType}{log.targetId ? ` #${log.targetId}` : ""}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  by {log.actorEmail ?? "system"}
                  {log.details ? ` — ${log.details}` : ""}
                </p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                {format(new Date(log.createdAt), "MMM d · HH:mm")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
