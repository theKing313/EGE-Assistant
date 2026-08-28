/**
 * Billing and study-plan settings from the backend environment.
 * Frontend must read these via API — never hardcode the Premium price.
 */
function positiveInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export function formatPriceLabel(amount, currency) {
  if (currency === "RUB") return `${amount} ₽/месяц`;
  return `${amount} ${currency}/month`;
}

export function getBillingConfig() {
  const monthlyAmount = positiveInt("PREMIUM_PRICE_RUB", 149);
  const currency = process.env.PREMIUM_CURRENCY || "RUB";
  const dailyGoal = positiveInt("STUDY_DAILY_GOAL", 10);
  const timezone = process.env.STUDY_TIMEZONE || "Europe/Moscow";

  return {
    monthlyAmount,
    currency,
    period: "month",
    dailyGoal,
    timezone,
    label: formatPriceLabel(monthlyAmount, currency),
  };
}
