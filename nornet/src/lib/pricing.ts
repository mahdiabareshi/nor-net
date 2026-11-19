// PRICING — قیمت‌گذاری سمت سرور (قانون طلایی: قیمت هرگز از کلاینت پذیرفته نمی‌شود)
import { db } from '@/lib/db'

export interface PricingConfig {
  oneMonthPerGB: number // تومان برای هر GB در ۱ ماه
  twoMonthPerGB: number
  threeMonthPerGB: number
  extraDevicePrice: number
  freeDevices: number
  unlimitedPrices: Record<string, number> // months → تومان
}

export const DEFAULT_PRICING: PricingConfig = {
  oneMonthPerGB: 5000,
  twoMonthPerGB: 7000,
  threeMonthPerGB: 10000,
  extraDevicePrice: 1000,
  freeDevices: 3,
  unlimitedPrices: { '1': 250000, '2': 450000, '3': 650000, '6': 1200000, '12': 2200000 },
}

export async function getPricing(): Promise<PricingConfig> {
  const row = await db.setting.findUnique({ where: { key: 'pricing' } })
  if (!row) return DEFAULT_PRICING
  try {
    const parsed = JSON.parse(row.value) as Partial<PricingConfig>
    return { ...DEFAULT_PRICING, ...parsed, unlimitedPrices: { ...DEFAULT_PRICING.unlimitedPrices, ...(parsed.unlimitedPrices || {}) } }
  } catch {
    return DEFAULT_PRICING
  }
}

export async function savePricing(p: PricingConfig) {
  await db.setting.upsert({ where: { key: 'pricing' }, create: { key: 'pricing', value: JSON.stringify(p) }, update: { value: JSON.stringify(p) } })
}

function rateFor(months: number, p: PricingConfig): number {
  if (months === 1) return p.oneMonthPerGB
  if (months === 2) return p.twoMonthPerGB
  return p.threeMonthPerGB
}

export function calcPrice(kind: 'volume' | 'unlimited', gb: number, months: number, devices: number, p: PricingConfig): number | null {
  if (kind === 'volume') {
    const g = Math.max(1, Math.round(gb || 0))
    const m = Math.max(1, Math.round(months || 0))
    const d = Math.max(1, Math.round(devices || 0))
    const extra = Math.max(0, d - p.freeDevices) * p.extraDevicePrice
    return g * rateFor(m, p) + extra
  }
  // نامحدود: فقط ماه‌های تعریف‌شده
  const key = String(Math.round(months || 0))
  const base = p.unlimitedPrices[key]
  if (!base) return null
  const extra = Math.max(0, Math.max(1, Math.round(devices || 1)) - p.freeDevices) * p.extraDevicePrice
  return base + extra
}
