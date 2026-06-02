import { useState, useEffect } from "react";
import { useGetAdminPricingPlans, useUpdatePricingPlan } from "@workspace/api-client-react";
import type { PricingPlan } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, X, Star } from "lucide-react";

function PlanEditor({ plan, onSaved }: { plan: PricingPlan; onSaved: () => void }) {
  const updatePlan = useUpdatePricingPlan();
  const { toast } = useToast();
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState(plan.price);
  const [headline, setHeadline] = useState(plan.headline ?? "");
  const [description, setDescription] = useState(plan.description ?? "");
  const [features, setFeatures] = useState<string[]>(plan.features);
  const [popular, setPopular] = useState(plan.popular);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    setName(plan.name); setPrice(plan.price); setHeadline(plan.headline ?? "");
    setDescription(plan.description ?? ""); setFeatures(plan.features); setPopular(plan.popular);
  }, [plan]);

  const save = async () => {
    try {
      await updatePlan.mutateAsync({
        planId: plan.id,
        data: { name, price, headline: headline || null, description: description || null, features, popular },
      });
      toast({ title: "Plan saved", description: `${name} updated.` });
      onSaved();
    } catch (err: any) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className={`rounded-2xl border bg-[#0c0c0c] p-5 space-y-4 ${popular ? "border-primary/40" : "border-white/8"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">{plan.id}</span>
        <button onClick={() => setPopular((v) => !v)} className={`flex items-center gap-1 text-[10px] font-mono uppercase rounded px-2 py-1 border ${popular ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground border-white/15"}`}>
          <Star className={`w-3 h-3 ${popular ? "fill-primary" : ""}`} /> Popular
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} className="bg-black/50 border-white/10" /></Field>
        <Field label="Price (credits)"><Input type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value) || 0)} className="bg-black/50 border-white/10" /></Field>
      </div>
      <Field label="Headline"><Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="bg-black/50 border-white/10" /></Field>
      <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} className="bg-black/50 border-white/10" /></Field>

      <Field label="Features">
        <div className="space-y-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={f}
                onChange={(e) => setFeatures((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                className="bg-black/50 border-white/10 h-8 text-xs"
              />
              <Button size="icon" variant="outline" className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0" onClick={() => setFeatures((arr) => arr.filter((_, j) => j !== i))}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add feature..."
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newFeature.trim()) { setFeatures((arr) => [...arr, newFeature.trim()]); setNewFeature(""); } }}
              className="bg-black/50 border-white/10 h-8 text-xs"
            />
            <Button size="icon" variant="outline" className="h-8 w-8 border-primary/40 text-primary hover:bg-primary/10 shrink-0" onClick={() => { if (newFeature.trim()) { setFeatures((arr) => [...arr, newFeature.trim()]); setNewFeature(""); } }}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Field>

      <Button onClick={save} disabled={updatePlan.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
        <Save className="w-4 h-4 mr-2" />
        {updatePlan.isPending ? "Saving..." : "Save Plan"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function AdminPricing() {
  const { data: plans, isLoading, refetch } = useGetAdminPricingPlans({ query: { queryKey: ["admin-pricing"] } });

  if (isLoading) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {(plans ?? []).map((p) => (
        <PlanEditor key={p.id} plan={p} onSaved={refetch} />
      ))}
      {(plans ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground col-span-full text-center py-12">No pricing plans configured.</p>
      )}
    </div>
  );
}
