import { useState } from "react";
import {
  useAdminCheck,
  useAdminLogin,
  useGetAdminUsers,
  useAddUserCredits,
  useGetPlanPrices,
  useUpdatePlanPrices,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Search, Plus, Fingerprint, KeyRound, UserPlus, Trash2, ShieldCheck } from "lucide-react";

export default function Admin() {
  const { data: adminCheck, refetch: refetchAdminCheck } = useAdminCheck();
  const adminLogin = useAdminLogin();
  const { data: planPrices, refetch: refetchPrices } = useGetPlanPrices();
  const updatePrices = useUpdatePlanPrices();
  const addUserCredits = useAddUserCredits();

  const [passcode, setPasscode] = useState("");
  const [search, setSearch] = useState("");
  const { data: users, refetch: refetchUsers } = useGetAdminUsers(
    { search },
    { query: { enabled: !!adminCheck?.adminPanelVerified, queryKey: ["admin-users", search] } }
  );

  const { toast } = useToast();
  const [pricesForm, setPricesForm] = useState({ basic: 0, advanced: 0, protection: 0 });
  const [creditAmounts, setCreditAmounts] = useState<Record<number, string>>({});
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);

  if (planPrices && pricesForm.basic === 0 && pricesForm.advanced === 0 && pricesForm.protection === 0) {
    setPricesForm(planPrices);
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminLogin.mutateAsync({ data: { passcode } });
      toast({ title: "Admin Access Granted" });
      refetchAdminCheck();
    } catch {
      toast({ title: "Access Denied", description: "Invalid passcode.", variant: "destructive" });
    }
  };

  const handleBiometricAuth = async () => {
    setPasskeyLoading(true);
    try {
      const opts = await fetch("/api/admin/passkey/register-options").then(r => r.json());
      const challengeBytes = base64urlToBytes(opts.challenge);

      const storedCredId = localStorage.getItem("nexus_passkey_cred");
      const requestOpts: PublicKeyCredentialRequestOptions = {
        challenge: challengeBytes as unknown as ArrayBuffer,
        rpId: window.location.hostname,
        timeout: 60000,
        userVerification: "required",
      };
      if (storedCredId) {
        requestOpts.allowCredentials = [{ id: base64urlToBytes(storedCredId) as unknown as ArrayBuffer, type: "public-key" }];
      }

      const assertion = (await navigator.credentials.get({ publicKey: requestOpts })) as PublicKeyCredential | null;
      if (!assertion) throw new Error("No credential returned");

      const credentialId = bytesToBase64url(new Uint8Array(assertion.rawId));
      const res = await fetch("/api/admin/passkey/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      toast({ title: "Biometric Verified", description: "Admin access granted." });
      refetchAdminCheck();
    } catch (err: any) {
      toast({ title: "Biometric Failed", description: err.message || "Verification failed.", variant: "destructive" });
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true);
    try {
      const opts = await fetch("/api/admin/passkey/register-options").then(r => r.json());
      const challengeBytes = base64urlToBytes(opts.challenge);
      const userIdBytes = new TextEncoder().encode(opts.userId);

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes as unknown as ArrayBuffer,
          rp: { name: "Nexus Security", id: window.location.hostname },
          user: { id: userIdBytes, name: opts.userName, displayName: opts.userName },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error("No credential created");
      const credentialId = bytesToBase64url(new Uint8Array(credential.rawId));
      localStorage.setItem("nexus_passkey_cred", credentialId);

      const res = await fetch("/api/admin/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      toast({ title: "Passkey Enrolled", description: "Biometric authentication is now active." });
      refetchAdminCheck();
    } catch (err: any) {
      toast({ title: "Enrollment Failed", description: err.message || "Could not enroll passkey.", variant: "destructive" });
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleRemovePasskey = async () => {
    setPasskeyLoading(true);
    try {
      const res = await fetch("/api/admin/passkey", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      localStorage.removeItem("nexus_passkey_cred");
      toast({ title: "Passkey Removed" });
      refetchAdminCheck();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamEmail.trim()) return;
    setTeamLoading(true);
    try {
      const res = await fetch("/api/admin/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: teamEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Team Member Added", description: data.message });
      setTeamEmail("");
      refetchUsers();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setTeamLoading(false);
    }
  };

  const handleUpdatePrices = async () => {
    try {
      await updatePrices.mutateAsync({ data: pricesForm });
      toast({ title: "Prices Updated", description: "Plan credit costs updated." });
      refetchPrices();
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleAddCredits = async (userId: number) => {
    const amount = parseInt(creditAmounts[userId] || "0", 10);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await addUserCredits.mutateAsync({ userId, data: { amount } });
      toast({ title: "Credits Added", description: `Added ${amount} credits.` });
      setCreditAmounts(prev => ({ ...prev, [userId]: "" }));
      refetchUsers();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  if (adminCheck && !adminCheck.isAdmin) {
    return <div className="p-12 text-center font-mono text-destructive">ERROR: NON-ADMIN_ENTITY_DETECTED</div>;
  }

  if (adminCheck && !adminCheck.adminPanelVerified) {
    const hasBiometric = adminCheck.hasPasskey && !showPasscodeForm;

    return (
      <div className="flex-1 w-full min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <Card className="w-full max-w-md glass-panel border-destructive/30">
          <CardHeader className="text-center pb-4">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-3" />
            <CardTitle className="text-destructive font-mono uppercase tracking-widest text-base">Restricted Area</CardTitle>
            <p className="text-xs text-muted-foreground font-mono mt-1">Admin panel verification required</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasBiometric ? (
              <>
                <Button
                  onClick={handleBiometricAuth}
                  disabled={passkeyLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase font-bold tracking-widest flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  {passkeyLoading ? "Verifying..." : "Verify with Biometric"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPasscodeForm(true)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 font-mono"
                >
                  Use passcode instead
                </button>
              </>
            ) : (
              <>
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Enter Passcode"
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    className="bg-black/50 border-destructive/30 focus-visible:ring-destructive font-mono text-center text-lg tracking-widest"
                  />
                  <Button
                    type="submit"
                    disabled={adminLogin.isPending}
                    className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none uppercase font-bold tracking-widest"
                  >
                    {adminLogin.isPending ? "Authorizing..." : "Authorize"}
                  </Button>
                </form>
                {adminCheck?.hasPasskey && (
                  <button
                    type="button"
                    onClick={() => setShowPasscodeForm(false)}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 font-mono flex items-center justify-center gap-1.5"
                  >
                    <Fingerprint className="w-3.5 h-3.5" /> Use biometric instead
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b border-border/50 pb-5 flex items-center gap-3">
          <ShieldAlert className="text-destructive w-7 h-7" />
          <h1 className="text-2xl font-bold brand-text text-foreground uppercase tracking-widest">Root Access</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ── Left column ── */}
          <div className="md:col-span-1 space-y-5">
            {/* Plan Pricing */}
            <Card className="glass-panel border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono uppercase text-xs text-primary tracking-wider border-b border-primary/20 pb-2">Plan Pricing (CRD)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(["basic", "advanced", "protection"] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-mono text-muted-foreground uppercase">{key === "protection" ? "Protection+" : key.charAt(0).toUpperCase() + key.slice(1)}</label>
                    <Input type="number" value={pricesForm[key]} onChange={e => setPricesForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))} className="font-mono bg-black/50 h-8 text-sm" />
                  </div>
                ))}
                <Button onClick={handleUpdatePrices} disabled={updatePrices.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2 rounded-none text-xs uppercase font-bold tracking-wider">
                  Update Pricing
                </Button>
              </CardContent>
            </Card>

            {/* Security — passkey */}
            <Card className="glass-panel border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono uppercase text-xs text-primary tracking-wider border-b border-primary/20 pb-2 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5" /> Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {adminCheck?.hasPasskey ? (
                  <>
                    <div className="flex items-center gap-2 py-2 px-3 bg-primary/5 border border-primary/20 rounded-sm">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-mono text-foreground">Passkey Active</p>
                        <p className="text-[10px] text-muted-foreground">Biometric auth is enabled</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleRemovePasskey}
                      disabled={passkeyLoading}
                      variant="outline"
                      className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 rounded-none text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {passkeyLoading ? "Removing..." : "Remove Passkey"}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground font-mono">No biometric enrolled. Register your fingerprint or face ID to skip the passcode.</p>
                    <Button
                      onClick={handleRegisterPasskey}
                      disabled={passkeyLoading}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Fingerprint className="w-3.5 h-3.5" />
                      {passkeyLoading ? "Enrolling..." : "Enroll Biometric"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Team Access */}
            <Card className="glass-panel border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono uppercase text-xs text-primary tracking-wider border-b border-primary/20 pb-2 flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5" /> Team Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTeamMember} className="space-y-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={teamEmail}
                    onChange={e => setTeamEmail(e.target.value)}
                    className="font-mono bg-black/50 h-8 text-xs"
                  />
                  <Button type="submit" disabled={teamLoading || !teamEmail.trim()} className="w-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 rounded-none text-xs uppercase font-bold tracking-wider">
                    {teamLoading ? "Adding..." : "Grant Admin Access"}
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground font-mono mt-3 leading-relaxed">
                  The account must already exist. Team members can set up their own biometric or use the shared passcode.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── User Directory ── */}
          <Card className="glass-panel border-border/50 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-primary/20">
              <CardTitle className="font-mono uppercase text-xs text-primary tracking-wider">User Directory</CardTitle>
              <div className="relative w-56">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-7 h-7 text-xs font-mono bg-black/50"
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
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground text-right">Credits</TableHead>
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
                      <TableCell className="text-right font-mono font-bold text-primary text-sm">{user.credits} CRD</TableCell>
                      <TableCell className="text-center font-mono text-xs">{user.totalScans}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Input
                            type="number"
                            placeholder="Amt"
                            className="w-14 h-7 text-xs font-mono px-2 bg-black/50"
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

// ── Helpers ──────────────────────────────────────────────────────
function base64urlToBytes(b64: string): Uint8Array {
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "==".slice(0, (4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return view;
}

function bytesToBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
