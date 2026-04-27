const { getGenerationPlan } = require('../../config/generation-plans')
const { GenerationUsage } = require('../../models/generationUsage.model')
const RequestError = require('../../helpers/RequestError')

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

function isAdmin(user) {
  return user?.role === 'admin'
}

function resolveUserPlanKey(user) {
  if (!user) return 'visitor'

  if (isAdmin(user)) return 'admin'

  const planKey = user?.subscription?.planKey || 'free'
  const status = user?.subscription?.status || 'free'

  if ((planKey === 'basic' || planKey === 'pro') && status === 'active') {
    return planKey
  }

  return 'free'
}

function buildUsageFilter({ user, visitorId, periodType, periodKey }) {
  const actorType = user ? 'user' : 'visitor'

  return {
    actorType,
    userId: user?._id || null,
    visitorId: user ? '' : String(visitorId || '').trim(),
    periodType,
    periodKey,
  }
}

function buildUnlimitedAccess({ user }) {
  return {
    actorType: 'user',
    planKey: 'admin',
    isUnlimited: true,
    plan: {
      planKey: 'admin',
      title: 'Admin',
      dailyLimit: null,
      monthlyLimit: null,
      allowedQualities: ['draft', 'standard', 'premium', 'print'],
      allowedFormats: ['portrait_2_3', 'square_1_1', 'landscape_3_2'],
      printMonthlyLimit: null,
    },
    dailyCount: 0,
    monthlyCount: 0,
    remainingDaily: null,
    remainingMonthly: null,
  }
}

async function checkGenerationAccess({
  user,
  visitorId,
  outputFormat,
  photoQuality,
}) {
  if (isAdmin(user)) {
    return buildUnlimitedAccess({ user })
  }

  const actorType = user ? 'user' : 'visitor'

  if (!user && !String(visitorId || '').trim()) {
    throw RequestError(400, 'visitorId is required for guest generation')
  }

  const planKey = resolveUserPlanKey(user)
  const plan = getGenerationPlan(planKey)

  if (!plan.allowedQualities.includes(photoQuality)) {
    throw RequestError(403, 'This quality is not available for your plan')
  }

  if (!plan.allowedFormats.includes(outputFormat)) {
    throw RequestError(403, 'This format is not available for your plan')
  }

  const todayKey = getDateKey()
  const monthKey = getMonthKey()

  const dailyFilter = buildUsageFilter({
    user,
    visitorId,
    periodType: 'day',
    periodKey: todayKey,
  })

  const monthlyFilter = buildUsageFilter({
    user,
    visitorId,
    periodType: 'month',
    periodKey: monthKey,
  })

  const [dailyUsage, monthlyUsage] = await Promise.all([
    GenerationUsage.findOne(dailyFilter).lean(),
    GenerationUsage.findOne(monthlyFilter).lean(),
  ])

  const dailyCount = dailyUsage?.count || 0
  const monthlyCount = monthlyUsage?.count || 0

  if (dailyCount >= plan.dailyLimit) {
    throw RequestError(403, 'Daily generation limit reached')
  }

  if (monthlyCount >= plan.monthlyLimit) {
    throw RequestError(403, 'Monthly generation limit reached')
  }

  return {
    actorType,
    planKey,
    isUnlimited: false,
    plan,
    dailyCount,
    monthlyCount,
    remainingDaily: plan.dailyLimit - dailyCount,
    remainingMonthly: plan.monthlyLimit - monthlyCount,
  }
}

async function incrementGenerationUsage({ user, visitorId, planKey }) {
  if (isAdmin(user)) {
    return null
  }

  const todayKey = getDateKey()
  const monthKey = getMonthKey()

  const dailyFilter = buildUsageFilter({
    user,
    visitorId,
    periodType: 'day',
    periodKey: todayKey,
  })

  const monthlyFilter = buildUsageFilter({
    user,
    visitorId,
    periodType: 'month',
    periodKey: monthKey,
  })

  const update = {
    $setOnInsert: {
      actorType: user ? 'user' : 'visitor',
      userId: user?._id || null,
      visitorId: user ? '' : String(visitorId || '').trim(),
    },
    $set: {
      planKey,
    },
    $inc: {
      count: 1,
    },
  }

  await Promise.all([
    GenerationUsage.updateOne(dailyFilter, update, { upsert: true }),
    GenerationUsage.updateOne(monthlyFilter, update, { upsert: true }),
  ])
}

function buildUsageResponse(access, usedNow = false) {
  if (access.isUnlimited) {
    return {
      actorType: access.actorType,
      planKey: access.planKey,
      isUnlimited: true,
      dailyLimit: null,
      monthlyLimit: null,
      remainingDaily: null,
      remainingMonthly: null,
    }
  }

  const used = usedNow ? 1 : 0

  return {
    actorType: access.actorType,
    planKey: access.planKey,
    isUnlimited: false,
    dailyLimit: access.plan.dailyLimit,
    monthlyLimit: access.plan.monthlyLimit,
    usedDaily: access.dailyCount + used,
    usedMonthly: access.monthlyCount + used,
    remainingDaily: Math.max(access.remainingDaily - used, 0),
    remainingMonthly: Math.max(access.remainingMonthly - used, 0),
  }
}

module.exports = {
  checkGenerationAccess,
  incrementGenerationUsage,
  buildUsageResponse,
  resolveUserPlanKey,
}
