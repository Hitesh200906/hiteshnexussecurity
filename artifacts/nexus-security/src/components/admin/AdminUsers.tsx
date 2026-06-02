import { useState } from "react";
import {
  useGetAdminUsers,
  useUpdateUserPlan,
  useAdminUserAction,
  useAddUserCredits,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Ban, ShieldCheck, PauseCircle, PlayCircle, BadgeCheck, Loader2 } from "lucide-react";

const PLANS = ["", "basic", "advanced", "protection"];

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading, refetch } = useGetAdminUsers(
    { search },
    { query: { queryKey: ["admin-users", search] } }
  );
  const updatePlan = useUpdateUserPlan();
  const userAction = useAdminUserAction();
  const addCredits = useAddUserCredits();
  const { toast } = useToast();
  const [creditAmts, setCreditAmts] = useState<Record<number, string>>({});

  const doAction = async (userId: number, action: "ban" | "unban" | "suspend" | "unsuspend" | "verify", label: string) => {
    try {
      await userAction.mutateAsync({ userId, data: { action } });
      toast({ title: label });
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const changePlan = async (userId: number, plan: string) => {
    try {
      await updatePlan.mutateAsync({ userId, data: { plan } });
      toast({ title: "Plan updated" });
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const giveCredits = async (userId: number) => {
    const amount = parseInt(creditAmts[userId] || "0", 10);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await addCredits.mutateAsync({ userId, data: { amount } });
      toast({ title: "Credits added", description: `Added ${amount} credits.` });
      setCreditAmts((p) => ({ ...p, [userId]: "" }));
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-black/50 border-white/10"
        />
      </div>

      <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground/70 border-b border-white/8">
                  <th className="text-left font-normal p-4">User</th>
                  <th className="text-left font-normal p-4">Status</th>
                  <th className="text-left font-normal p-4">Plan</th>
                  <th className="text-center font-normal p-4">Scans</th>
                  <th className="text-right font-normal p-4">Credits</th>
                  <th className="text-right font-normal p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 align-middle">
                    <td className="p-4">
                      <div className="font-medium text-foreground">{u.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {u.isBanned && <Tag className="text-destructive border-destructive/30 bg-destructive/10">Banned</Tag>}
                        {u.isSuspended && <Tag className="text-amber-400 border-amber-500/30 bg-amber-500/10">Suspended</Tag>}
                        {u.isVerified ? (
                          <Tag className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10">Verified</Tag>
                        ) : (
                          <Tag className="text-muted-foreground border-white/15 bg-white/5">Unverified</Tag>
                        )}
                        {u.role && u.role !== "user" && (
                          <Tag className="text-primary border-primary/30 bg-primary/10">{u.role === "super_admin" ? "Super" : "Admin"}</Tag>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={u.plan ?? ""}
                        onChange={(e) => changePlan(u.id, e.target.value)}
                        className="h-8 rounded bg-black/50 border border-white/10 px-2 text-xs text-foreground capitalize"
                      >
                        {PLANS.map((p) => (
                          <option key={p} value={p}>{p === "" ? "None" : p}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4 text-center font-mono text-xs">{u.totalScans}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-mono font-bold text-primary mr-1">{u.credits}</span>
                        <Input
                          type="number"
                          placeholder="+"
                          className="w-14 h-7 text-xs font-mono px-2 bg-black/50"
                          value={creditAmts[u.id] || ""}
                          onChange={(e) => setCreditAmts((p) => ({ ...p, [u.id]: e.target.value }))}
                        />
                        <Button size="icon" variant="outline" className="h-7 w-7 border-primary/50 text-primary hover:bg-primary/20" onClick={() => giveCredits(u.id)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        {!u.isVerified && (
                          <IconBtn title="Verify" onClick={() => doAction(u.id, "verify", "User verified")}><BadgeCheck className="w-3.5 h-3.5" /></IconBtn>
                        )}
                        {u.isSuspended ? (
                          <IconBtn title="Unsuspend" onClick={() => doAction(u.id, "unsuspend", "User unsuspended")}><PlayCircle className="w-3.5 h-3.5" /></IconBtn>
                        ) : (
                          <IconBtn title="Suspend" onClick={() => doAction(u.id, "suspend", "User suspended")}><PauseCircle className="w-3.5 h-3.5" /></IconBtn>
                        )}
                        {u.isBanned ? (
                          <IconBtn title="Unban" className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => doAction(u.id, "unban", "User unbanned")}><ShieldCheck className="w-3.5 h-3.5" /></IconBtn>
                        ) : (
                          <IconBtn title="Ban" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => doAction(u.id, "ban", "User banned")}><Ban className="w-3.5 h-3.5" /></IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(users ?? []).length === 0 && (
                  <tr><td colSpan={6} className="h-24 text-center text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-[9px] font-mono uppercase tracking-wide rounded px-1.5 py-0.5 border ${className}`}>{children}</span>;
}

function IconBtn({ children, title, onClick, className = "border-white/15 text-muted-foreground hover:bg-white/10" }: { children: React.ReactNode; title: string; onClick: () => void; className?: string }) {
  return (
    <Button size="icon" variant="outline" title={title} onClick={onClick} className={`h-7 w-7 ${className}`}>
      {children}
    </Button>
  );
}
