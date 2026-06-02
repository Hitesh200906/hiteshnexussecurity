import { useState } from "react";
import { useAdminCheck, useAdminLogin, useGetStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert, Fingerprint, KeyRound, Trash2, ShieldCheck,
  LayoutDashboard, Users, Crown, MessageSquare, ScanLine, FileText, Tag, ScrollText, Lock,
  Menu, X,
} from "lucide-react";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminAdmins } from "@/components/admin/AdminAdmins";
import { AdminSupport } from "@/components/admin/AdminSupport";
import { AdminScans } from "@/components/admin/AdminScans";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminPricing } from "@/components/admin/AdminPricing";
import { AdminAuditLogs } from "@/components/admin/AdminAuditLogs";

type SectionId = "overview" | "users" | "admins" | "support" | "scans" | "reports" | "pricing" | "audit" | "security";

const NAV: { id: SectionId; label: string; icon: typeof Users; super?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "admins", label: "Admins", icon: Crown, super: true },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "scans", label: "Scans", icon: ScanLine },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "pricing", label: "Pricing", icon: Tag, super: true },
  { id: "audit", label: "Audit Logs", icon: ScrollText, super: true },
  { id: "security", label: "Security", icon: KeyRound },
];

export default function Admin() {
  const { data: adminCheck, refetch: refetchAdminCheck } = useAdminCheck();
  const { data: status } = useGetStatus();
  const adminLogin = useAdminLogin();
  const { toast } = useToast();

  const [passcode, setPasscode] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);
  const [section, setSection] = useState<SectionId>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isSuperAdmin = status?.user?.role === "super_admin" || status?.user?.isSuperAdmin === true;

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
      const opts = await fetch("/api/admin/passkey/register-options").then((r) => r.json());
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
      const opts = await fetch("/api/admin/passkey/register-options").then((r) => r.json());
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
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
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
                <Button onClick={handleBiometricAuth} disabled={passkeyLoading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase font-bold tracking-widest flex items-center justify-center gap-2">
                  <Fingerprint className="w-4 h-4" />
                  {passkeyLoading ? "Verifying..." : "Verify with Biometric"}
                </Button>
                <button type="button" onClick={() => setShowPasscodeForm(true)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 font-mono">
                  Use passcode instead
                </button>
              </>
            ) : (
              <>
                <form onSubmit={handleAdminLogin} className="space-y-3">
                  <Input type="password" placeholder="Enter Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="bg-black/50 border-destructive/30 focus-visible:ring-destructive font-mono text-center text-lg tracking-widest" />
                  <Button type="submit" disabled={adminLogin.isPending} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none uppercase font-bold tracking-widest">
                    {adminLogin.isPending ? "Authorizing..." : "Authorize"}
                  </Button>
                </form>
                {adminCheck?.hasPasskey && (
                  <button type="button" onClick={() => setShowPasscodeForm(false)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 font-mono flex items-center justify-center gap-1.5">
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

  const visibleNav = NAV.filter((n) => !n.super || isSuperAdmin);
  const activeNav = visibleNav.find((n) => n.id === section) ?? visibleNav[0];

  const selectSection = (id: SectionId) => {
    setSection(id);
    setMobileNavOpen(false);
  };

  return (
    <div className="flex-1 w-full bg-background pt-20">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/8 bg-[#080808] sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto p-4 gap-1">
          <div className="flex items-center gap-2 px-2 pb-4 mb-2 border-b border-white/8">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground tracking-wide">Control Center</p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{isSuperAdmin ? "Super Admin" : "Admin"}</p>
            </div>
          </div>
          {visibleNav.map((n) => (
            <button
              key={n.id}
              onClick={() => selectSection(n.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${section === n.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
            >
              <n.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{n.label}</span>
              {n.super && <Lock className="w-3 h-3 ml-auto text-amber-400/70" />}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-5 sm:p-6 md:p-8">
          {/* Mobile menu toggle */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/12 bg-white/5 text-sm font-medium text-foreground"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              Menu
            </button>

            {mobileNavOpen && (
              <div className="mt-3 rounded-2xl border border-white/8 bg-[#0c0c0c] p-3">
                <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-white/8">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Admin Console</p>
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(47,155,155,0.8)]" />
                </div>
                <div className="flex flex-col gap-1">
                  {visibleNav.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => selectSection(n.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${section === n.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                    >
                      <n.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{n.label}</span>
                      {n.super && <Lock className="w-3 h-3 ml-auto text-amber-400/70" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{activeNav.label}</h1>
            <p className="text-sm text-muted-foreground mt-1">{sectionDescription(activeNav.id)}</p>
          </div>

          {section === "overview" && <AdminOverview />}
          {section === "users" && <AdminUsers />}
          {section === "admins" && isSuperAdmin && <AdminAdmins />}
          {section === "support" && <AdminSupport />}
          {section === "scans" && <AdminScans />}
          {section === "reports" && <AdminReports />}
          {section === "pricing" && isSuperAdmin && <AdminPricing />}
          {section === "audit" && isSuperAdmin && <AdminAuditLogs />}
          {section === "security" && (
            <SecurityPanel
              hasPasskey={!!adminCheck?.hasPasskey}
              loading={passkeyLoading}
              onEnroll={handleRegisterPasskey}
              onRemove={handleRemovePasskey}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function sectionDescription(id: SectionId): string {
  switch (id) {
    case "overview": return "Platform metrics and activity at a glance.";
    case "users": return "Manage accounts, plans, credits and access.";
    case "admins": return "Grant or revoke administrator privileges.";
    case "support": return "Respond to customer support tickets.";
    case "scans": return "Monitor, reassign and manage scan jobs.";
    case "reports": return "Generated scan reports across all users.";
    case "pricing": return "Edit the public pricing plans.";
    case "audit": return "Immutable log of administrative actions.";
    case "security": return "Manage your biometric passkey.";
  }
}

function SecurityPanel({ hasPasskey, loading, onEnroll, onRemove }: { hasPasskey: boolean; loading: boolean; onEnroll: () => void; onRemove: () => void }) {
  return (
    <div className="max-w-lg rounded-2xl border border-white/8 bg-[#0c0c0c] p-6 space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <KeyRound className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">Biometric Passkey</h3>
      </div>
      {hasPasskey ? (
        <>
          <div className="flex items-center gap-3 py-3 px-4 bg-primary/5 border border-primary/20 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm text-foreground">Passkey Active</p>
              <p className="text-xs text-muted-foreground">Biometric auth lets you skip the passcode.</p>
            </div>
          </div>
          <Button onClick={onRemove} disabled={loading} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 mr-2" />
            {loading ? "Removing..." : "Remove Passkey"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">No biometric enrolled. Register your fingerprint or face ID to skip the passcode on future visits.</p>
          <Button onClick={onEnroll} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Fingerprint className="w-4 h-4 mr-2" />
            {loading ? "Enrolling..." : "Enroll Biometric"}
          </Button>
        </>
      )}
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
