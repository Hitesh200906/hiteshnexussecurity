import { useState } from "react";
import { useGetAdmins, useAddAdmin, useRemoveAdmin } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Trash2, UserPlus, Crown, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function AdminAdmins() {
  const { data: admins, isLoading, refetch } = useGetAdmins({ query: { queryKey: ["admins"] } });
  const addAdmin = useAddAdmin();
  const removeAdmin = useRemoveAdmin();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await addAdmin.mutateAsync({ data: { email: email.trim(), role } });
      toast({ title: "Admin added", description: `${email.trim()} is now ${role === "super_admin" ? "a super admin" : "an admin"}.` });
      setEmail("");
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "Could not add admin.", variant: "destructive" });
    }
  };

  const handleRemove = async (userId: number, label: string) => {
    try {
      await removeAdmin.mutateAsync({ userId });
      toast({ title: "Admin removed", description: `${label} no longer has admin access.` });
      refetch();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message ?? "Could not remove admin.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="rounded-2xl border border-white/8 bg-[#0c0c0c] p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground">Grant admin access</label>
          <Input
            type="email"
            placeholder="existing-user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black/50 border-white/10"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "super_admin")}
          className="h-10 rounded-md bg-black/50 border border-white/10 px-3 text-sm text-foreground"
        >
          <option value="admin">Admin</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <Button type="submit" disabled={addAdmin.isPending || !email.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-2" />
          {addAdmin.isPending ? "Adding..." : "Add"}
        </Button>
      </form>

      <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <div className="divide-y divide-white/5">
            {(admins ?? []).map((a) => {
              const isSuper = a.role === "super_admin";
              return (
                <div key={a.id} className="p-4 flex items-center gap-4 hover:bg-white/5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isSuper ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"}`}>
                    {isSuper ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{a.email}</p>
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-wide rounded px-2 py-1 ${isSuper ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
                    {isSuper ? "Super Admin" : "Admin"}
                  </span>
                  <span className="hidden md:block text-[10px] font-mono text-muted-foreground/60">{format(new Date(a.createdAt), "MMM yyyy")}</span>
                  {!isSuper && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(a.id, a.email)}
                      disabled={removeAdmin.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
            {(admins ?? []).length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No admins found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
