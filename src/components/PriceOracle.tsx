import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useLivePrice } from '@/hooks/useLivePrice';
import { useCountUp } from '@/hooks/useCountUp';
import { useMarketForecast } from '@/hooks/useMarketForecast';
import { useSellNowHold } from '@/hooks/useSellNowHold';

const WASTE_LABELS: Record<string, string> = {
  paddy_husk: 'Paddy Husk',
  wheat_straw: 'Wheat Straw',
  corn_stalks: 'Corn Stalks',
  sugarcane_bagasse: 'Sugarcane Bagasse',
  coconut_shells: 'Coconut Shells',
};

export interface PriceOracleProps {
  wasteType: string;
  city: string;
  quantityTons: number;
  farmerPricePerKg?: number | null;
  /** When set, show this in LIVE MARKET PRICE (from DeepSeek chat), e.g. "₹8–₹10/kg" */
  chatMarketPriceLabel?: string | null;
}

export default function PriceOracle({
  wasteType,
  city,
  quantityTons,
  farmerPricePerKg,
  chatMarketPriceLabel,
}: PriceOracleProps) {
  const { data, loading, error, refetch } = useLivePrice(wasteType, city, quantityTons);
  const { data: forecastData, loading: forecastLoading } = useMarketForecast(wasteType, city);
  const { data: sellHoldData, loading: sellHoldLoading } = useSellNowHold(wasteType, city);
  const priceDisplay = useCountUp(data?.pricePerKg ?? 0, { duration: 800, fromValue: 0 });
  const showChatPrice = !!chatMarketPriceLabel?.trim();

  const cropLabel = WASTE_LABELS[wasteType] || wasteType;
  const confidenceLabel =
    data?.confidence === 'high' ? '🟢 Live Data' : data?.confidence === 'medium' ? '🟡 Estimated' : '🔴 Fallback';
  const trendLabel =
    data?.trend === 'rising'
      ? '📈 Price Rising — Good time to sell'
      : data?.trend === 'falling'
        ? '📉 Price Falling — Sell Now or Store'
        : '➡️ Stable Market — Negotiate firmly';

  const range = data?.priceRange ?? { min: 1, max: 3 };
  const span = range.max - range.min || 1;
  const farmerPct =
    farmerPricePerKg != null && farmerPricePerKg > 0
      ? Math.min(100, Math.max(0, ((farmerPricePerKg - range.min) / span) * 100))
      : null;
  const marketPct = data?.pricePerKg != null ? Math.min(100, Math.max(0, ((data.pricePerKg - range.min) / span) * 100)) : 50;

  const diffPct =
    data?.pricePerKg != null && farmerPricePerKg != null && farmerPricePerKg > 0 && data.pricePerKg > 0
      ? Math.round(((farmerPricePerKg - data.pricePerKg) / data.pricePerKg) * 100)
      : null;

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Crop</div>
        <div className="font-semibold text-[var(--text-primary)]" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {cropLabel} · {city}
        </div>
      </div>

      <div className="text-xs uppercase tracking-widest text-[var(--crop-green)] flex items-center gap-2">
        <span className="arena-live-dot h-2 w-2 rounded-full bg-[var(--crop-green)]" />
        Live Market Price
      </div>

      {loading && (
        <div className="rounded-xl border-2 border-[var(--crop-green)]/40 bg-[var(--field)] p-6">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="h-8 w-24 bg-[var(--crop-green)]/20 rounded animate-pulse" />
            <p className="text-sm text-[var(--text-muted)]">Fetching live rate…</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Waiting for API</p>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--field)] p-4 text-sm text-[var(--danger)] flex flex-col gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-xs font-semibold text-[var(--crop-green)] hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {(!loading && data != null) || showChatPrice ? (
        <>
          <motion.div
            className="rounded-xl border-2 border-[var(--crop-green)]/40 bg-[var(--field)] p-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {showChatPrice ? (
              <>
                <div className="font-display text-3xl md:text-4xl text-[var(--crop-green)] tracking-tight" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  {chatMarketPriceLabel}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--harvest)]">Market rate</span>
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  🟢 From DeepSeek (chat)
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-display text-4xl text-[var(--crop-green)] tracking-tight" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    ₹{priceDisplay.toFixed(2)}
                  </div>
                  <span className="text-sm text-[var(--text-muted)]">/kg</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--harvest)]">
                    {diffPct != null && diffPct > 0 && `▲ ABOVE MARKET +${diffPct}%`}
                    {diffPct != null && diffPct < 0 && `▼ BELOW MARKET ${diffPct}%`}
                    {diffPct != null && diffPct === 0 && '● AT MARKET'}
                    {diffPct == null && 'Market rate'}
                  </span>
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {confidenceLabel}
                </div>
                {data?.source && (
                  <div className="mt-1 text-[10px] text-[var(--text-muted)] truncate" title={data.source}>
                    {data.source}
                  </div>
                )}
              </>
            )}
          </motion.div>

          <div className="rounded-lg bg-[var(--field)] border border-white/10 p-3">
            <div className="text-[10px] uppercase text-[var(--text-muted)] mb-2">Price range (₹/kg)</div>
            <div className="relative h-3 rounded-full bg-white/10 overflow-visible">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--crop-green)]/30 transition-all duration-1000"
                style={{ width: `${marketPct}%` }}
              />
              {farmerPct != null && (
                <div
                  className="absolute top-1/2 w-3 h-3 -translate-y-1/2 rounded-full bg-[var(--harvest)] shadow-lg shadow-[var(--harvest)]/50 border-2 border-[var(--void)]"
                  style={{ left: `calc(${farmerPct}% - 6px)` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-mono text-[var(--text-muted)]">
              <span>₹{range.min}</span>
              <span>₹{range.max}</span>
            </div>
          </div>

          <div
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              (data?.trend ?? 'stable') === 'rising'
                ? 'bg-[var(--crop-green)]/15 text-[var(--safe)]'
                : (data?.trend ?? 'stable') === 'falling'
                  ? 'bg-[var(--harvest)]/15 text-[var(--harvest)]'
                  : 'bg-[var(--neutral)]/15 text-[var(--neutral)]'
            }`}
          >
            {trendLabel}
          </div>

          <div className="rounded-lg bg-[var(--field)] border border-white/10 p-4 space-y-2">
            <div className="text-[10px] uppercase text-[var(--text-muted)]">If you sell instead of burning</div>
            <div className="text-sm text-[var(--crop-green)]">
              🌱 Carbon credits ≈ ₹{((data?.carbonValuePerTon ?? 340) * quantityTons).toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              🌫️ ~{(quantityTons * 1000 * 0.15).toFixed(0)} kg PM2.5 prevented
            </div>
          </div>

          {/* 30-day price forecast table */}
          <div className="rounded-xl border border-[var(--crop-green)]/20 bg-[var(--field)] overflow-hidden">
            <div className="text-[10px] uppercase tracking-widest text-[var(--crop-green)] px-4 py-3 border-b border-white/10">
              Price forecast (30 days)
            </div>
            {forecastLoading ? (
              <div className="p-4 animate-pulse flex gap-2">
                <div className="h-4 flex-1 bg-white/10 rounded" />
                <div className="h-4 flex-1 bg-white/10 rounded" />
              </div>
            ) : forecastData?.periods?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-[var(--text-muted)]">
                      <th className="px-4 py-2 font-medium">Period</th>
                      <th className="px-4 py-2 font-medium">Min (₹/kg)</th>
                      <th className="px-4 py-2 font-medium">Max (₹/kg)</th>
                      <th className="px-4 py-2 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.periods.map((p, i) => (
                      <tr key={i} className="border-b border-white/5 text-[var(--text-primary)]">
                        <td className="px-4 py-2">{p.period}</td>
                        <td className="px-4 py-2 text-[var(--harvest)]">{p.minPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 text-[var(--crop-green)]">{p.maxPrice.toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <span
                            className={
                              p.trend === 'rising'
                                ? 'text-[var(--safe)]'
                                : p.trend === 'falling'
                                  ? 'text-[var(--danger)]'
                                  : 'text-[var(--neutral)]'
                            }
                          >
                            {p.trend === 'rising' ? '↑' : p.trend === 'falling' ? '↓' : '→'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {/* Sell Now vs Hold — Groww-style */}
          <div className="rounded-xl border-2 border-[var(--crop-green)]/30 bg-[var(--field)] overflow-hidden">
            <div className="text-[10px] uppercase tracking-widest text-[var(--crop-green)] px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <span className="arena-live-dot h-1.5 w-1.5 rounded-full bg-[var(--crop-green)]" />
              Sell Now vs Hold
            </div>
            {sellHoldLoading ? (
              <div className="p-6 animate-pulse h-32 bg-white/5 rounded-b-xl" />
            ) : sellHoldData ? (
              <div className="p-4 space-y-4">
                <div
                  className={`rounded-xl px-4 py-3 border-2 ${
                    sellHoldData.recommendation === 'sell_now'
                      ? 'border-[var(--safe)] bg-[var(--safe)]/10'
                      : 'border-[var(--harvest)] bg-[var(--harvest)]/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg text-[var(--text-primary)]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                      {sellHoldData.recommendation === 'sell_now' ? 'SELL NOW' : 'HOLD'}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{sellHoldData.confidence}% confidence</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{sellHoldData.reason}</p>
                </div>
                <div className="h-40 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={sellHoldData.chartData.map((d) => ({ ...d, name: d.label, price: d.value }))}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="priceGradientOracle" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00ff7f" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#00ff7f" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={32} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--field)',
                          border: '1px solid var(--crop-green)',
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        formatter={(value: number) => [`₹${Number(value).toFixed(2)}/kg`, 'Price']}
                        labelFormatter={(label) => label}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#00ff7f"
                        strokeWidth={2}
                        fill="url(#priceGradientOracle)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Actual</span>
                  <span>Projected</span>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
