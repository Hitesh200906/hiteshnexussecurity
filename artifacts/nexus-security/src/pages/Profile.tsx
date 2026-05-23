import { useState } from "react";
import { useGetStatus, useGetScanStats, useGetScans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Terminal, Activity, ShieldCheck, Zap, Download, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function Profile() {
  const { data: status } = useGetStatus();
  const { data: stats } = useGetScanStats({ query: { enabled: !!status?.loggedIn, queryKey: ["scan-stats"] } });
  const { data: scans } = useGetScans({ query: { enabled: !!status?.loggedIn, queryKey: ["scans"] } });
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  if (!status?.loggedIn) {
    return <div className="p-8 text-center text-muted-foreground">Unauthorized access.</div>;
  }

  const user = status.user;

  return (
    <div className="flex-1 w-full bg-background p-6 md:p-12 relative overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="text-3xl font-bold brand-text text-foreground flex items-center gap-3">
              <Terminal className="text-primary w-8 h-8" />
              Command Center
            </h1>
            <p className="text-muted-foreground mt-2 font-mono text-sm">
              OPERATOR: {user?.name} | {user?.email}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground font-mono mb-1">AVAILABLE_CREDITS_</div>
            <div className="text-3xl font-bold text-primary glow-primary inline-block font-mono bg-primary/10 px-4 py-1 rounded-sm border border-primary/30">
              {stats?.credits ?? 0}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-panel border-border/50 bg-card/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Scans Executed</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-mono text-foreground">{stats?.totalScans ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-border/50 bg-card/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Completed Reports</CardTitle>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-mono text-foreground">{stats?.completedScans ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Scan History */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold brand-text border-l-4 border-primary pl-3">Scan History</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {!scans || scans.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border/50 rounded-lg text-muted-foreground font-mono text-sm">
                NO_SCAN_DATA_FOUND
              </div>
            ) : (
              scans.map((scan) => (
                <Card key={scan.id} className="glass-panel border-border/50 bg-black/40 overflow-hidden group">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-foreground">{scan.companyName}</span>
                        <Badge variant="outline" className="border-primary/50 text-primary uppercase font-mono text-[10px]">
                          {scan.plan}
                        </Badge>
                        <Badge className={`uppercase font-mono text-[10px] ${
                          scan.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          scan.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`} variant="outline">
                          {scan.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground font-mono">
                        TARGET: <a href={scan.websiteUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{scan.websiteUrl}</a>
                      </div>
                      <div className="text-xs text-muted-foreground/70 font-mono">
                        INITIATED: {format(new Date(scan.createdAt), 'yyyy-MM-dd HH:mm:ss')} | COST: {scan.creditsSpent} CRD
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {scan.status === 'completed' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="transform -skew-x-12 border-primary/50 text-primary hover:bg-primary/20 h-9"
                            onClick={() => setSelectedReportId(selectedReportId === scan.id ? null : scan.id)}
                          >
                            <div className="transform skew-x-12 flex items-center gap-2 font-bold tracking-wider text-xs">
                              <Eye className="w-4 h-4" /> VIEW REPORT
                            </div>
                          </Button>
                          <Button 
                            size="sm"
                            className="transform -skew-x-12 bg-primary text-primary-foreground hover:bg-primary/90 glow-primary h-9"
                            asChild
                          >
                            <a href={`/api/scans/${scan.id}/report/download`} download>
                              <div className="transform skew-x-12 flex items-center gap-2 font-bold tracking-wider text-xs">
                                <Download className="w-4 h-4" /> PDF
                              </div>
                            </a>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Expandable Report Panel */}
                  <AnimatePresence>
                    {selectedReportId === scan.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: '500px', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/50 bg-black/60 relative"
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
  );
}
