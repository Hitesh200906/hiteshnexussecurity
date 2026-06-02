import { useState } from "react";
import {
  useGetAdminTickets,
  useGetAdminTicket,
  useUpdateTicket,
  usePostAdminTicketMessage,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

const STATUSES = ["open", "in_progress", "pending", "resolved", "closed"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

function statusLabel(s: string): string {
  return s.replace(/_/g, " ");
}

function statusColor(s: string): string {
  switch (s) {
    case "open": return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    case "in_progress": return "text-sky-400 border-sky-500/30 bg-sky-500/10";
    case "pending": return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    case "resolved": return "text-primary border-primary/30 bg-primary/10";
    default: return "text-muted-foreground border-white/15 bg-white/5";
  }
}

export function AdminSupport() {
  const { data: tickets, isLoading, refetch } = useGetAdminTickets(undefined, { query: { queryKey: ["admin-tickets"] } });
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: thread, refetch: refetchThread } = useGetAdminTicket(activeId ?? "", {
    query: { enabled: !!activeId, queryKey: ["admin-ticket", activeId] },
  });
  const updateTicket = useUpdateTicket();
  const postMessage = usePostAdminTicketMessage();
  const { toast } = useToast();
  const [reply, setReply] = useState("");

  const sendReply = async () => {
    if (!activeId || !reply.trim()) return;
    try {
      await postMessage.mutateAsync({ ticketId: activeId, data: { body: reply.trim() } });
      setReply("");
      refetchThread();
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const patch = async (data: { status?: string; priority?: string }) => {
    if (!activeId) return;
    try {
      await updateTicket.mutateAsync({ ticketId: activeId, data });
      refetchThread();
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-[600px]">
      <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/8 text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Tickets</div>
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <div className="divide-y divide-white/5 overflow-y-auto flex-1">
            {(tickets ?? []).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left p-4 hover:bg-white/5 transition-colors ${activeId === t.id ? "bg-white/5" : ""}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate">{t.subject}</span>
                  <span className={`text-[9px] font-mono uppercase rounded px-1.5 py-0.5 border shrink-0 ${statusColor(t.status)}`}>{statusLabel(t.status)}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{t.userEmail}</p>
                {t.preview && <p className="text-[11px] text-muted-foreground/70 truncate mt-1">{t.preview}</p>}
              </button>
            ))}
            {(tickets ?? []).length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No tickets.</div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] flex flex-col">
        {!activeId || !thread ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm">Select a ticket to view the conversation.</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/8 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{thread.ticket.subject}</h3>
                <p className="text-xs text-muted-foreground font-mono">{thread.ticket.email ?? ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={thread.ticket.status} onChange={(e) => patch({ status: e.target.value })} className="h-8 rounded bg-black/50 border border-white/10 px-2 text-xs capitalize">
                  {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
                <select value={thread.ticket.priority} onChange={(e) => patch({ priority: e.target.value })} className="h-8 rounded bg-black/50 border border-white/10 px-2 text-xs capitalize">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[440px]">
              {thread.messages.map((m) => {
                const fromStaff = m.senderRole === "admin" || m.senderRole === "super_admin";
                return (
                  <div key={m.id} className={`flex ${fromStaff ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${fromStaff ? "bg-primary/15 border border-primary/20" : "bg-white/5 border border-white/8"}`}>
                      <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-1">{m.senderName ?? m.senderRole} · {format(new Date(m.createdAt), "MMM d HH:mm")}</p>
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/8 flex gap-2">
              <Input
                placeholder="Type a reply..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                className="bg-black/50 border-white/10"
              />
              <Button onClick={sendReply} disabled={postMessage.isPending || !reply.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
