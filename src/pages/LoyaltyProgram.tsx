import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Building2, Loader2, ShieldCheck, Sparkles, Star, TrendingUp } from "lucide-react";
import TierBadge from "@/components/TierBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStaticLoyaltyData, type LoyaltyCompanyProfile, type LoyaltyStatusResponse } from "@/lib/loyaltyApi";

function CompanyRow({ company, rank }: { company: LoyaltyCompanyProfile; rank?: number }) {
  const [logoErrored, setLogoErrored] = useState(false);
  const showLogo = company.logoUrl && !logoErrored;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-neutral-800">
      <div className="flex min-w-0 items-center gap-3">
        {showLogo ? (
          <img
            src={company.logoUrl}
            alt={`${company.name} logo`}
            className="h-10 w-10 rounded-md border border-black/10 bg-white p-1 object-contain dark:border-white/10 dark:bg-neutral-700"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setLogoErrored(true)}
          />
        ) : (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-700">
            <Building2 className="h-5 w-5 text-black/70 dark:text-white/70" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-black dark:text-white">
            {rank ? `${rank}. ` : ""}
            {company.name}
          </p>
          <p className="truncate text-xs text-black/60 dark:text-white/60">{company.segment || "Startup/Buyer"}</p>
        </div>
      </div>
      <p className="text-right text-sm font-black text-black dark:text-white">{company.score.toFixed(1)}</p>
      <TierBadge tier={company.tier} showLabel={false} className="justify-self-end !px-2 !py-1 !text-[11px]" />
    </div>
  );
}

function TierIcon({ tier }: { tier: "A" | "B" | "C" }) {
  if (tier === "A") return <Star className="h-4 w-4" />;
  if (tier === "B") return <ShieldCheck className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

export default function LoyaltyProgram() {
  const navigate = useNavigate();
  const [data, setData] = useState<LoyaltyStatusResponse | null>(() => getStaticLoyaltyData());
  const loading = false;
  const error: string | null = null;

  const topCompanies = useMemo(() => data?.topCompanies || [], [data?.topCompanies]);
  const allCompanies = useMemo(() => {
    if (Array.isArray(data?.allCompanies) && data.allCompanies.length) return data.allCompanies;
    const source = data?.tierCompanies;
    if (!source) return [];
    return [...(source.A || []), ...(source.B || []), ...(source.C || [])];
  }, [data?.allCompanies, data?.tierCompanies]);

  const tierStats = useMemo(() => {
    const source = data?.tierCompanies || { A: [], B: [], C: [] };
    return [
      { key: "A" as const, label: "Tier A (Elite)", count: source.A.length },
      { key: "B" as const, label: "Tier B (Established)", count: source.B.length },
      { key: "C" as const, label: "Tier C (Emerging)", count: source.C.length },
    ];
  }, [data?.tierCompanies]);

  const trustSignalTierText = useMemo(() => {
    if (loading) return "Calculating...";
    if (error) return "Unavailable";
    if (data?.tierLabel) return data.tierLabel;
    if (data?.tier) return `Tier ${data.tier}`;
    return "Not available";
  }, [data?.tier, data?.tierLabel, error, loading]);

  const trustSignalScoreText = useMemo(() => {
    if (loading) return "Calculating...";
    if (error) return "--";
    if (typeof data?.score === "number") return data.score.toFixed(1);
    return "--";
  }, [data?.score, error, loading]);

  return (
    <div className="min-h-screen bg-[#e6e8eb] px-4 py-8 sm:px-6 lg:px-8 dark:bg-background">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[28px] border border-black/10 bg-white p-6 md:p-8 dark:border-white/10 dark:bg-neutral-900"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2 text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-green-500/20 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-green-400/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex rounded-full border border-black/10 bg-black px-4 py-1 text-[11px] uppercase tracking-[0.24em] text-white dark:border-white/20 dark:bg-white/10 dark:text-white">
                Startup Loyalty Dashboard
              </div>
              <h1 className="mt-4 font-display text-4xl font-black leading-tight text-black md:text-5xl dark:text-white">
                Company Trust Intelligence
                <br />
                Board
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-black/70 md:text-base dark:text-white/70">
                Analyze buyer companies with weighted trust scoring, rank the top performers, and move into dedicated tier pages for
                comparison and DeepSeek-backed reasoning.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {data?.tier ? <TierBadge tier={data.tier} className="!text-sm" /> : null}
                <span className="rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white">
                  Your Score: {data?.score?.toFixed(1) ?? "--"}
                </span>
              </div>
            </div>
            <div className="min-w-[250px] rounded-2xl border border-black/10 bg-[#f7f7f8] p-4 dark:border-white/10 dark:bg-neutral-800">
              <p className="text-xs uppercase tracking-[0.2em] text-black/60 dark:text-white/60">Tier Distribution</p>
              <div className="mt-3 space-y-2">
                {tierStats.map((row) => (
                  <div key={row.key} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm dark:bg-neutral-700 dark:text-white">
                    <span className="flex items-center gap-2 text-black dark:text-white">
                      <TierIcon tier={row.key} />
                      {row.label}
                    </span>
                    <span className="font-bold text-black dark:text-white">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06, duration: 0.35 }}
            className="space-y-6 xl:col-span-8"
          >
            <Card className="rounded-[24px] border border-black/10 bg-[#f7f7f8] shadow-none dark:border-white/10 dark:bg-neutral-800">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-black dark:text-white">Top Companies</h2>
                    <p className="text-sm text-black/60 dark:text-white/60">Top 5-10 ranked by weighted loyalty score.</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-black/70 dark:text-white/70" />
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 text-black/70 dark:text-white/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading ranked companies...</span>
                  </div>
                ) : null}
                {!loading && error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
                {!loading && !error ? (
                  <div className="space-y-2.5">
                    {topCompanies.slice(0, 10).map((company, index) => (
                      <CompanyRow key={`${company.name}-${company.tier}-${index}`} company={company} rank={index + 1} />
                    ))}
                    {topCompanies.length === 0 ? <p className="text-sm text-black/60 dark:text-white/60">No ranked companies available yet.</p> : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-black/10 bg-[#f7f7f8] shadow-none dark:border-white/10 dark:bg-neutral-800">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-black dark:text-white">All Listed Companies</h2>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black dark:bg-neutral-700 dark:text-white">Total: {allCompanies.length}</span>
                </div>
                <div className="grid gap-2.5 md:grid-cols-2">
                  {allCompanies.map((company, index) => (
                    <CompanyRow key={`${company.name}-${index}`} company={company} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
            className="space-y-6 xl:col-span-4"
          >
            <Card className="overflow-hidden rounded-[24px] border border-black/10 bg-black shadow-none dark:border-white/10">
              <CardContent className="relative p-6 text-white">
                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-green-500/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 grid h-28 grid-cols-7 gap-2 opacity-85">
                  {[28, 36, 24, 42, 30, 46, 34].map((h, i) => (
                    <div key={i} className="relative rounded-full bg-white/10">
                      <div className="absolute bottom-0 left-0 right-0 rounded-full bg-green-400/90" style={{ height: `${h}%` }} />
                    </div>
                  ))}
                </div>
                <div className="relative z-10 min-h-[250px] pb-28">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70">Loyalty Analytics</p>
                  <h3 className="mt-2 text-3xl font-black leading-tight">Revenue Trust Signal</h3>
                  <p className="mt-2 max-w-xs text-sm text-white/70">
                    Composite buyer trust score driven by reputation, accountability, tenure, and reviews.
                  </p>
                </div>
                <div className="relative z-10 mt-1 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                    <p className="text-white/60">Current Tier</p>
                    <p className="font-bold">{trustSignalTierText}</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                    <p className="text-white/60">Composite Score</p>
                    <p className="font-bold">{trustSignalScoreText}</p>
                  </div>
                </div>
                {!loading && error ? (
                  <p className="relative z-10 mt-3 text-xs text-red-300">Status endpoint is unavailable right now.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-black/10 bg-[#f7f7f8] shadow-none dark:border-white/10 dark:bg-neutral-800">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-black dark:text-white">Tier Metrics</h3>
                  <TrendingUp className="h-4 w-4 text-black/60 dark:text-white/60" />
                </div>
                <div className="space-y-2.5">
                  {Object.entries(data?.breakdown || {}).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-neutral-700">
                      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-black/55 dark:text-white/60">
                        <span>{key}</span>
                        <span>{Number(value).toFixed(1)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-black/10 dark:bg-white/20">
                        <div className="h-2 rounded-full bg-green-500" style={{ width: `${Math.min(100, Number(value))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-black/10 bg-[#f7f7f8] shadow-none dark:border-white/10 dark:bg-neutral-800">
              <CardContent className="space-y-3 p-6">
                <h3 className="text-lg font-bold text-black dark:text-white">Open Tier Pages</h3>
                <p className="text-sm text-black/60 dark:text-white/60">Compare Tier A/B/C company matrices and reasoning.</p>
                {(["A", "B", "C"] as const).map((tier) => (
                  <Link key={tier} to={`/loyalty/tier/${tier}`} className="block">
                    <Button className="w-full justify-between rounded-xl border border-black/20 bg-white text-black hover:bg-green-500 hover:text-white dark:border-white/20 dark:bg-neutral-700 dark:text-white dark:hover:bg-green-500 dark:hover:text-white">
                      <span>Open Tier {tier}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
