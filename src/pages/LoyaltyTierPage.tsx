import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Loader2, TrendingUp } from "lucide-react";
import TierBadge, { type LoyaltyTier } from "@/components/TierBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStaticLoyaltyData, type LoyaltyCompanyProfile, type LoyaltyStatusResponse } from "@/lib/loyaltyApi";

const tierNames: Record<LoyaltyTier, string> = {
  A: "Tier A (Elite)",
  B: "Tier B (Established)",
  C: "Tier C (Emerging)",
};

const metricOrder: Array<keyof LoyaltyCompanyProfile["breakdown"]> = [
  "reputation",
  "accountability",
  "duration",
  "reviewVolume",
];

const metricLabels: Record<keyof LoyaltyCompanyProfile["breakdown"], string> = {
  reputation: "Reputation",
  accountability: "Accountability",
  duration: "Duration",
  reviewVolume: "Reviews Volume",
};

function resolveTier(input: string | undefined): LoyaltyTier {
  const value = String(input || "").toUpperCase();
  if (value === "A" || value === "B" || value === "C") return value;
  return "C";
}

function MatrixCell({ value }: { value: number }) {
  return (
    <div className="relative h-8 w-full overflow-hidden rounded-lg border border-black/10 bg-white">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-300"
        style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
      />
      <span className="relative z-10 block px-2 py-1 text-right text-xs font-bold text-black">{value.toFixed(1)}</span>
    </div>
  );
}

export default function LoyaltyTierPage() {
  const { tier: tierParam } = useParams();
  const tier = resolveTier(tierParam);
  const data: LoyaltyStatusResponse | null = useMemo(() => getStaticLoyaltyData(), []);
  const loading = false;

  const companies = useMemo(() => {
    const list = data?.tierCompanies?.[tier] || [];
    return [...list].sort((a, b) => b.score - a.score);
  }, [data?.tierCompanies, tier]);

  const topCompany = companies[0];
  const tierInsight = data?.tierInsights?.[tier] || `Tier ${tier} comparison is based on weighted trust metrics.`;

  return (
    <div className="min-h-screen bg-[#e6e8eb] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[28px] border border-black/10 bg-white p-6 md:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/60">Tier Dedicated Intelligence</p>
              <h1 className="mt-2 font-display text-4xl font-black text-black">{tierNames[tier]} Companies</h1>
              <p className="mt-3 max-w-3xl text-black/65">
                Compare companies in this tier using a full score matrix and DeepSeek reasoning on why leaders provide stronger buyer
                outcomes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TierBadge tier={tier} className="!text-sm" />
              <Link to="/loyalty">
                <Button variant="outline" className="border-black/20 bg-white text-black hover:bg-black hover:text-white">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.35 }}
            className="xl:col-span-8"
          >
            <Card className="rounded-[24px] border border-black/10 bg-[#f7f7f8] shadow-none">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-black">Comparison Matrix</h2>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                    Companies: {companies.length}
                  </span>
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 text-black/70">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Loading tier matrix...</span>
                  </div>
                ) : null}
                {!loading && companies.length === 0 ? (
                  <p className="text-sm text-black/60">No companies found in this tier.</p>
                ) : null}
                {!loading && companies.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-black/10 text-left text-black/70">
                          <th className="px-3 py-3">Rank</th>
                          <th className="px-3 py-3">Company</th>
                          <th className="px-3 py-3">Score</th>
                          {metricOrder.map((metric) => (
                            <th key={metric} className="min-w-[150px] px-3 py-3">
                              {metricLabels[metric]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((company, idx) => (
                          <tr key={`${company.name}-${idx}`} className="border-b border-black/5 last:border-0">
                            <td className="px-3 py-3 font-black text-black">#{idx + 1}</td>
                            <td className="px-3 py-3">
                              <div>
                                <p className="font-semibold text-black">{company.name}</p>
                                <p className="text-xs text-black/60">{company.segment || "Startup/Buyer"}</p>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-black text-black">{company.score.toFixed(1)}</td>
                            {metricOrder.map((metric) => (
                              <td key={`${company.name}-${metric}`} className="px-3 py-3">
                                <MatrixCell value={company.breakdown[metric]} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.35 }}
            className="space-y-6 xl:col-span-4"
          >
            <Card className="rounded-[24px] border border-black/10 bg-[#f7f7f8] shadow-none">
              <CardContent className="space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-black">DeepSeek Tier Reasoning</h2>
                  <TrendingUp className="h-4 w-4 text-black/60" />
                </div>
                <p className="whitespace-pre-line text-sm text-black/70">{tierInsight}</p>
              </CardContent>
            </Card>

            {topCompany ? (
              <Card className="rounded-[24px] border border-black/10 bg-black text-white shadow-none">
                <CardContent className="space-y-3 p-6">
                  <h3 className="text-lg font-bold">Top Company in This Tier</h3>
                  <p className="text-base font-bold">{topCompany.name}</p>
                  <p className="text-sm text-white/70">Score: {topCompany.score.toFixed(1)}</p>
                  <p className="whitespace-pre-line text-sm text-white/80">{topCompany.reasoning}</p>
                  <a href={topCompany.website} target="_blank" rel="noreferrer" className="inline-block">
                    <Button className="w-full gap-2 bg-white text-black hover:bg-green-500 hover:text-white">
                      Visit Company Site
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-[24px] border border-black/10 bg-[#f7f7f8] shadow-none">
              <CardContent className="space-y-3 p-6">
                <h3 className="text-lg font-bold text-black">Quick Tier Jump</h3>
                <div className="space-y-2">
                  {(["A", "B", "C"] as const).map((candidate) => (
                    <Link key={candidate} to={`/loyalty/tier/${candidate}`} className="block">
                      <Button
                        variant={candidate === tier ? "default" : "outline"}
                        className={
                          candidate === tier
                            ? "w-full bg-black text-white hover:bg-black/90"
                            : "w-full border-black/20 bg-white text-black hover:bg-green-500 hover:text-white"
                        }
                      >
                        Open Tier {candidate}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
