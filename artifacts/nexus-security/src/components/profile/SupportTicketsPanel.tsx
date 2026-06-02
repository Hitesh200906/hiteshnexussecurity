import { useEffect, useRef, useState } from "react";
import {
  useGetMyTickets,
  useGetMyTicket,
  usePostMyTicketMessage,
  useCreateSupportTicket,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Plus, Loader2, ArrowLeft, Headset } from "lucide-react";
import { format } from "date-fns";

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "open") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (s === "pending") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
  if (s === "closed") return "bg-white/5 text-muted-foreground border-white/15";
  return "bg-sky-500/10 text-sky-400 border-sky-500/30";
}

export function SupportTicketsPanel({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const { toast } = useToast();
  const { data: tickets, isLoading, refetch } = useGetMyTickets({ query: { queryKey: ["my-tickets"] } });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const sortedTickets = tickets ?? [];

  return (
    <div id="tickets" className="scroll-mt-28 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Headset className="w-5 h-5 text-primary" /> Support Tickets
        </h2>
        <Button
          onClick={() => { setComposing(true); setActiveId(null); }}
          className="rounded-full bg-primary text-black font-semibold hover:bg-primary/90 h-9 text-xs px-4"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* List */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-3 lg:max-h-[560px] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 text-primary/60 animate-spin" /></div>
          ) : sortedTickets.length === 0 ? (
            <div className="py-12 text-center px-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tickets yet. Open one to chat with our security team.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedTickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveId(t.id); setComposing(false); }}
                  className={`w-full text-left rounded-xl px-3.5 py-3 border transition-colors ${
                    activeId === t.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-white/5 hover:border-white/15 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground truncate">{t.subject}</span>
                    <span className={`text-[9px] font-mono uppercase tracking-wide border rounded px-1.5 py-0.5 shrink-0 ${statusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                  {t.preview && <p className="text-xs text-muted-foreground line-clamp-1">{t.preview}</p>}
                  <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                    {t.messageCount} message{t.messageCount === 1 ? "" : "s"} · {format(new Date(t.updatedAt), "MMM d")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thread / Composer */}
        <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] min-h-[420px] flex flex-col">
          {composing ? (
            <NewTicketForm
              userName={userName}
              userEmail={userEmail}
              onCreated={(id) => { setComposing(false); refetch(); setActiveId(id); }}
              onCancel={() => setComposing(false)}
            />
          ) : activeId ? (
            <TicketThread ticketId={activeId} onBack={() => setActiveId(null)} onChange={() => refetch()} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Select a ticket to view the conversation, or open a new ticket to reach our team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function NewTicketForm({
    userName,
    userEmail,
    onCreated,
    onCancel,
  }: {
    userName: string;
    userEmail: string;
    onCreated: (id: string) => void;
    onCancel: () => void;
  }) {
    const createTicket = useCreateSupportTicket();
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");

    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await createTicket.mutateAsync({
          data: { name: userName, email: userEmail, subject: subject.trim() || "Support request", message },
        });
        toast({ title: "Ticket opened", description: "Our team will reply here shortly." });
        setSubject("");
        setMessage("");
        onCreated(res.id);
      } catch (error: any) {
        const msg = error?.data?.error || error?.message || "Failed to open ticket.";
        toast({ title: "Could not open ticket", description: msg, variant: "destructive" });
      }
    };

    return (
      <form onSubmit={submit} className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 mb-5">
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-semibold text-foreground">New Support Ticket</h3>
        </div>
        <div className="space-y-4 flex-1">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Subject</Label>
            <Input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="bg-black/50 border-white/10 rounded-lg focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Message</Label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or question..."
              className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={createTicket.isPending}
          className="mt-4 rounded-full bg-primary text-black font-semibold hover:bg-primary/90 h-11"
        >
          {createTicket.isPending ? "Opening..." : <span className="flex items-center gap-2 justify-center"><Send className="w-4 h-4" /> Open Ticket</span>}
        </Button>
      </form>
    );
  }

  function TicketThread({
    ticketId,
    onBack,
    onChange,
  }: {
    ticketId: string;
    onBack: () => void;
    onChange: () => void;
  }) {
    const { data, isLoading, refetch } = useGetMyTicket(ticketId, { query: { queryKey: ["my-ticket", ticketId] } });
    const postMessage = usePostMyTicketMessage();
    const [body, setBody] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [data?.messages.length]);

    const send = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!body.trim()) return;
      try {
        await postMessage.mutateAsync({ ticketId, data: { body: body.trim() } });
        setBody("");
        await refetch();
        onChange();
      } catch (error: any) {
        const msg = error?.data?.error || error?.message || "Failed to send message.";
        toast({ title: "Could not send", description: msg, variant: "destructive" });
      }
    };

    if (isLoading || !data) {
      return <div className="flex-1 flex justify-center items-center"><Loader2 className="w-6 h-6 text-primary/60 animate-spin" /></div>;
    }

    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-3 p-4 border-b border-white/8">
          <button onClick={onBack} className="lg:hidden text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground truncate">{data.ticket.subject}</h3>
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              {data.ticket.status} · {data.ticket.priority} priority
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
          {data.messages.map((m) => {
            const mine = m.senderRole === "user";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                  mine
                    ? "bg-primary text-black rounded-br-sm"
                    : "bg-white/5 border border-white/10 text-foreground rounded-bl-sm"
                }`}>
                  <p className="text-[10px] font-mono uppercase tracking-wide opacity-70 mb-1">
                    {mine ? "You" : m.senderName || "Support"}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[9px] font-mono mt-1.5 ${mine ? "text-black/50" : "text-muted-foreground/50"}`}>
                    {format(new Date(m.createdAt), "MMM d · HH:mm")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={send} className="p-3 border-t border-white/8 flex items-center gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message..."
            className="bg-black/50 border-white/10 rounded-full focus-visible:ring-primary"
          />
          <Button
            type="submit"
            disabled={postMessage.isPending || !body.trim()}
            className="rounded-full bg-primary text-black font-semibold hover:bg-primary/90 h-10 w-10 p-0 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    );
  }
}
