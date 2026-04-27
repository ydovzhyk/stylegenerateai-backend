const GENERATION_PLANS = {
  visitor: {
    planKey: 'visitor',
    title: 'Visitor',
    priceUsd: 0,
    dailyLimit: 3,
    monthlyLimit: 3,
    allowedQualities: ['draft'],
    allowedFormats: ['portrait_2_3'],
    printMonthlyLimit: 0,
  },

  free: {
    planKey: 'free',
    title: 'Free',
    priceUsd: 0,
    dailyLimit: 5,
    monthlyLimit: 30,
    allowedQualities: ['draft', 'standard'],
    allowedFormats: ['portrait_2_3'],
    printMonthlyLimit: 0,
  },

  basic: {
    planKey: 'basic',
    title: 'Basic',
    priceUsd: 10,
    dailyLimit: 20,
    monthlyLimit: 300,
    allowedQualities: ['draft', 'standard'],
    allowedFormats: ['portrait_2_3', 'square_1_1', 'landscape_3_2'],
    printMonthlyLimit: 0,
  },

  pro: {
    planKey: 'pro',
    title: 'Pro',
    priceUsd: 20,
    dailyLimit: 40,
    monthlyLimit: 800,
    allowedQualities: ['draft', 'standard', 'premium'],
    allowedFormats: ['portrait_2_3', 'square_1_1', 'landscape_3_2'],
    printMonthlyLimit: 20,
  },
}

function getGenerationPlan(planKey) {
  return GENERATION_PLANS[planKey] || GENERATION_PLANS.free
}

module.exports = {
  GENERATION_PLANS,
  getGenerationPlan,
}
