import { prisma } from "../db/prisma.js";

// AI Settings
export async function getAiSettings() {
  let settings = await prisma.aiSetting.findUnique({
    where: { id: 1 },
  });

  if (!settings) {
    const defaultModel = process.env.GROQ_API_KEY
      ? (process.env.GROQ_MODEL || "llama-3.3-70b-versatile")
      : (process.env.AI_MODEL || "gpt-4o-mini");

    settings = await prisma.aiSetting.create({
      data: {
        id: 1,
        isEnabled: true,
        model: defaultModel,
        temperature: 0.7,
        maxToken: 2000,
        systemPrompt: "Bạn là trợ lý AI chuyên gia về build PC của pc-perfect.",
      },
    });
  }

  return settings;
}

export async function updateAiSettings(data) {
  // Ensure existing settings are updated; if not present, create with sensible defaults
  const existing = await prisma.aiSetting.findUnique({ where: { id: 1 } });

  if (existing) {
    const updated = await prisma.aiSetting.update({
      where: { id: 1 },
      data: data,
    });
    return updated;
  }

  const defaultModel = process.env.GROQ_API_KEY
    ? (process.env.GROQ_MODEL || "llama-3.3-70b-versatile")
    : (process.env.AI_MODEL || "gpt-4o-mini");

  const createData = {
    id: 1,
    isEnabled: data.isEnabled ?? true,
    model: data.model ?? defaultModel,
    temperature: data.temperature ?? 0.7,
    maxToken: data.maxToken ?? 2000,
    systemPrompt: data.systemPrompt ?? "Bạn là trợ lý AI chuyên gia về build PC của pc-perfect.",
  };

  const created = await prisma.aiSetting.create({ data: createData });
  return created;
}

export async function isAiEnabled() {
  const settings = await getAiSettings();
  return settings.isEnabled;
}

// AI Logs
export async function listAiLogs(query = {}) {
  const {
    page = 1,
    pageSize = 20,
    search = "",
    endpoint = "all",
  } = query;

  const take = Number(pageSize);
  const skip = (Number(page) - 1) * take;

  const where = {};
  
  if (endpoint !== "all") {
    where.endpoint = endpoint;
  }
  
  if (search) {
    where.OR = [
      { prompt: { contains: search, mode: "insensitive" } },
      { response: { contains: search, mode: "insensitive" } },
      { modelUsed: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.aiRequestLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    }),
    prisma.aiRequestLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page: Number(page),
      pageSize: take,
      totalItems: total,
      totalPages: Math.ceil(total / take),
    },
  };
}

export async function deleteAiLog(logId) {
  await prisma.aiRequestLog.delete({
    where: { id: Number(logId) },
  });
  return { success: true };
}

// Stats & Analytics
export async function getAiStats() {
  const settings = await getAiSettings();

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 13);
  startDate.setHours(0, 0, 0, 0);

  const [
    totalRequests,
    aggregate,
    endpointGroups,
    recentLogs,
    byUserGroups,
  ] = await Promise.all([
    prisma.aiRequestLog.count(),
    prisma.aiRequestLog.aggregate({
      _sum: {
        totalTokens: true,
        cost: true,
      },
    }),
    prisma.aiRequestLog.groupBy({
      by: ["endpoint"],
      _count: { endpoint: true },
      _sum: {
        totalTokens: true,
        cost: true,
      },
      orderBy: {
        _count: {
          endpoint: "desc",
        },
      },
    }),
    prisma.aiRequestLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        endpoint: true,
        totalTokens: true,
        cost: true,
        createdAt: true,
      },
    }),
    prisma.aiRequestLog.groupBy({
      by: ["userId"],
      where: {
        userId: {
          not: null,
        },
      },
      _count: {
        userId: true,
      },
      _sum: {
        totalTokens: true,
        cost: true,
      },
      orderBy: {
        _count: {
          userId: "desc",
        },
      },
      take: 5,
    }),
  ]);

  const topUserIds = byUserGroups
    .map((item) => item.userId)
    .filter((item) => Number.isInteger(item));

  const users = topUserIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: topUserIds,
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      })
    : [];

  const userById = new Map(users.map((item) => [item.id, item]));

  const endpointDistribution = endpointGroups.reduce((acc, item) => {
    const key = String(item.endpoint ?? "unknown");
    acc[key] = Number(item._count.endpoint ?? 0);
    return acc;
  }, {});

  const endpointCostBreakdown = endpointGroups.map((item) => ({
    endpoint: String(item.endpoint ?? "unknown"),
    requests: Number(item._count.endpoint ?? 0),
    tokens: Number(item._sum.totalTokens ?? 0),
    cost: Number(item._sum.cost ?? 0),
  }));

  const dailyMap = new Map();
  for (let i = 0; i < 14; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    dailyMap.set(key, {
      date: key,
      requests: 0,
      tokens: 0,
      cost: 0,
    });
  }

  for (const log of recentLogs) {
    const key = new Date(log.createdAt).toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (!bucket) {
      continue;
    }

    bucket.requests += 1;
    bucket.tokens += Number(log.totalTokens ?? 0);
    bucket.cost += Number(log.cost ?? 0);
  }

  const dailyUsage = Array.from(dailyMap.values());

  const topUsers = byUserGroups.map((item) => {
    const user = userById.get(item.userId);
    return {
      userId: item.userId,
      name: user?.fullName || user?.email || `User #${item.userId}`,
      email: user?.email || null,
      requests: Number(item._count.userId ?? 0),
      tokens: Number(item._sum.totalTokens ?? 0),
      cost: Number(item._sum.cost ?? 0),
    };
  });

  const totalTokens = Number(aggregate._sum.totalTokens ?? 0);
  const totalCost = Number(aggregate._sum.cost ?? 0);

  const topicRatios = endpointCostBreakdown.reduce((acc, item) => {
    const percentage =
      totalRequests > 0 ? Math.round((item.requests / totalRequests) * 100) : 0;
    acc[item.endpoint] = percentage;
    return acc;
  }, {});

  return {
    aiEnabled: Boolean(settings.isEnabled),
    totalRequests,
    totalTokens,
    totalCost,
    endpointDistribution,
    endpointCostBreakdown,
    dailyUsage,
    topUsers,
    topicRatios,
  };
}
