import { useState } from "react";
import { useAdminCheck, useAdminLogin, useGetAdminUsers, useAddUserCredits, useGetPlanPrices, useUpdatePlanPrices } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Search, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Admin() {
  const { data: adminCheck, refetch: refetchAdminCheck } = useAdminCheck();
  const adminLogin = useAdminLogin();
  const { data: planPrices, refetch: refetchPrices } = useGetPlanPrices();
  const updatePrices = useUpdatePlanPrices();
  const addUserCredits = useAddUserCredits();
  
  const [passcode, setPasscode] = useState("");
  const [search, setSearch] = useState("");
  const { data: users, refetch: refetchUsers } = useGetAdminUsers({ search }, { query: { enabled: !!adminCheck?.adminPanelVerified } });
  
  const { toast } = useToast();

  const [pricesForm, setPricesForm] = useState({ basic: 0, advanced: 0, protection: 0 });
  const [creditAmounts, setCreditAmounts] = useState<Record<number, string>>({});

  // Initialize prices form when loaded
  if (planPrices && pricesForm.basic === 0 && pricesForm.advanced === 0 && pricesForm.protection === 0) {
    setPricesForm(planPrices);
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminLogin.mutateAsync({ data: { passcode } });
      toast({ title: "Admin Access Granted" });
      refetchAdminCheck();
    } catch (error: any) {
      toast({ title: "Access Denied", description: "Invalid passcode.", variant: "destructive" });
    }
  };

  const handleUpdatePrices = async () => {
    try {
      await updatePrices.mutateAsync({ data: pricesForm });
      toast({ title: "Prices Updated", description: "Plan credit costs have been updated." });
      refetchPrices();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleAddCredits = async (userId: number) => {
    const amount = parseInt(creditAmounts[userId] || "0", 10);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await addUserCredits.mutateAsync({ userId, data: { amount } });
      toast({ title: "Credits Added", description: `Added ${amount} credits to user.` });
      setCreditAmounts(prev => ({ ...prev, [userId]: "" }));
      refetchUsers();
    } catch (error: any) {
      toast({ title: "Failed to add credits", description: error.message, variant: "destructive" });
    }
  };

  if (adminCheck && !adminCheck.isAdmin) {
    return <div className="p-12 text-center font-mono text-destructive">ERROR: NON-ADMIN_ENTITY_DETECTED</div>;
  }

  if (adminCheck && !adminCheck.adminPanelVerified) {
    return (
      <div className="flex-1 w-full min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <Card className="w-full max-w-md glass-panel border-destructive/30">
          <CardHeader className="text-center">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive font-mono uppercase tracking-widest">Restricted Area</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <Input 
                type="password" 
                placeholder="Enter Passcode" 
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                className="bg-black/50 border-destructive/30 focus-visible:ring-destructive font-mono text-center text-lg tracking-widest"
              />
              <Button type="submit" disabled={adminLogin.isPending} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none uppercase font-bold tracking-widest">
                Authorize
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-background p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b border-border/50 pb-6 flex items-center gap-3">
          <ShieldAlert className="text-destructive w-8 h-8" />
          <h1 className="text-3xl font-bold brand-text text-foreground uppercase tracking-widest">Root Access</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Plan Settings */}
          <Card className="glass-panel border-border/50 md:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="font-mono uppercase text-sm text-primary tracking-wider border-b border-primary/20 pb-2">Plan Pricing (CRD)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Basic Plan</label>
                <Input type="number" value={pricesForm.basic} onChange={e => setPricesForm(p => ({ ...p, basic: parseInt(e.target.value)||0 }))} className="font-mono bg-black/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Advanced Plan</label>
                <Input type="number" value={pricesForm.advanced} onChange={e => setPricesForm(p => ({ ...p, advanced: parseInt(e.target.value)||0 }))} className="font-mono bg-black/50" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Protection+ Plan</label>
                <Input type="number" value={pricesForm.protection} onChange={e => setPricesForm(p => ({ ...p, protection: parseInt(e.target.value)||0 }))} className="font-mono bg-black/50" />
              </div>
              <Button onClick={handleUpdatePrices} disabled={updatePrices.isPending} className="w-full transform -skew-x-12 bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-sm">
                <div className="transform skew-x-12 font-bold tracking-wider text-xs uppercase">Update Pricing Matrix</div>
              </Button>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="glass-panel border-border/50 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-primary/20">
              <CardTitle className="font-mono uppercase text-sm text-primary tracking-wider">User Directory</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by email..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono bg-black/50"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">ID / Name</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">Email</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Balance</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground text-center">Scans</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map(user => (
                    <TableRow key={user.id} className="border-border/50 hover:bg-white/5">
                      <TableCell>
                        <div className="font-mono text-xs text-muted-foreground">#{user.id}</div>
                        <div className="font-medium text-sm">{user.name}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{user.email}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{user.credits} CRD</TableCell>
                      <TableCell className="text-center font-mono text-xs">{user.totalScans}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Input 
                            type="number" 
                            placeholder="Amt" 
                            className="w-16 h-7 text-xs font-mono px-2 bg-black/50"
                            value={creditAmounts[user.id] || ""}
                            onChange={e => setCreditAmounts(p => ({ ...p, [user.id]: e.target.value }))}
                          />
                          <Button size="icon" variant="outline" className="h-7 w-7 border-primary/50 text-primary hover:bg-primary/20" onClick={() => handleAddCredits(user.id)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!users || users.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center font-mono text-muted-foreground">NO_RECORDS_FOUND</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
