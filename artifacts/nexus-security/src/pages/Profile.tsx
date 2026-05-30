import { useState } from "react";
import { useGetStatus, useGetScanStats, useGetScans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Coins, Download, Eye, X, LayoutDashboard, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Link } from "wouter";
import { Footer } from "@/components/Footer";

export default function Profile() {
  const { data: status } = useGetStatus();
  const { data: stats } = useGetScanStats({ query: { enabled: !!status?.loggedIn, queryKey: ["scan-stats"] } });
  const { data: scans } = useGetScans({ query: { enabled: !!status?.loggedIn, queryKey: ["scans"] } });

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  if (!status?.loggedIn) {
    return (
      <div className="flex-1 w-full min-h-screen flex items-center justify-center bg-[#060606] pt-28 px-4">
        <Card className="border border-white/10 rounded-2xl bg-[#0c0c0c] p-10 text-center max-w-md">
          <ShieldCheck className="w-12 h-12 text-primary/50 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in required</h2>
          <p className="text-sm text-muted-foreground mb-6">You need to be logged in to access your dashboard.</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold text-sm rounded-full hover:bg-primary/90 transition-colors">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>
    );
  }

  const user = status.user;

  const STAT_CARDS = [
    { label: "Available Credits", value: stats?.credits ?? 0, icon: Coins, accent: true },
    { label: "Total Scans", value: stats?.totalScans ?? 0, icon: Activity },
    { label: "Completed Reports", value: stats?.completedScans ?? 0, icon: ShieldCheck },
  ];

  return (
    <div className="flex-1 w-full bg-[#060606] relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(46,194,179,0.07)_0%,transparent_70%)]" />

      <div className="relative z-10 flex-1 w-full pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto space-y-8">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-0.5">{user?.name} · {user?.email}</p>
              </div>
            </div>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold text-sm rounded-full hover:bg-white/90 transition-colors w-fit shadow-[0_0_24px_rgba(255,255,255,0.12)]">
              New Scan <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {STAT_CARDS.map(({ label, value, icon: Icon, accent }) => (
              <Card key={label} className={`border rounded-2xl bg-[#0c0c0c] ${accent ? "border-primary/40 shadow-[0_0_32px_rgba(46,194,179,0.12)]" : "border-white/8"}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">{label}</CardTitle>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${accent ? "border border-primary/30 bg-primary/10" : "border border-white/8 bg-white/5"}`}>
                    <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold font-mono ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Scan History</h2>

            <div className="grid grid-cols-1 gap-4">
              {!scans || scans.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl text-muted-foreground bg-[#0a0a0a]">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm">No scans yet. Start your first security scan from the Pricing page.</p>
                </div>
              ) : (
                scans.map((scan) => (
                  <Card key={scan.id} className="border border-white/8 rounded-2xl bg-[#0c0c0c] overflow-hidden hover:border-primary/25 transition-colors">
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-base text-foreground">{scan.companyName}</span>
                          <Badge variant="outline" className="border-primary/40 text-primary uppercase font-mono text-[10px]">
                            {scan.plan}
                          </Badge>
                          <Badge className={`uppercase font-mono text-[10px] ${
                            scan.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                            scan.status === 'failed' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                            'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                          }`} variant="outline">
                            {scan.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Target: <a href={scan.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono">{scan.websiteUrl}</a>
                        </div>
                        <div className="text-xs text-muted-foreground/60 font-mono">
                          {format(new Date(scan.createdAt), 'MMM d, yyyy · HH:mm')} · {scan.creditsSpent} credits
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {scan.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full border-primary/40 text-primary hover:bg-primary/10 h-9 text-xs"
                              onClick={() => setSelectedReportId(selectedReportId === scan.id ? null : scan.id)}
                            >
                              <Eye className="w-4 h-4 mr-1.5" /> View Report
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-full bg-primary text-black hover:bg-primary/90 h-9 text-xs font-semibold"
                              asChild
                            >
                              <a href={`/api/scans/${scan.id}/report/download`} download>
                                <Download className="w-4 h-4 mr-1.5" /> PDF
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedReportId === scan.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: '500px', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/8 bg-black/60 relative"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 z-10 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedReportId(null)}
                          >
                            <X className="w-5 h-5" />
                          </Button>
                          <iframe
                            src={`/api/scans/${scan.id}/report`}
                            className="w-full h-full border-0 bg-white"
                            title={`Report for ${scan.id}`}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
