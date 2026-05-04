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
      { prompt: { contains: search } },
      { response: { contains: search } },
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
  const [totalLogs, logs] = await Promise.all([
    prisma.aiRequestLog.count(),
    prisma.aiRequestLog.findMany({
      select: {
        endpoint: true,
        totalTokens: true,
        cost: true,
        createdAt: true,
      },
    }),
  ]);

  // Aggregate stats
  let totalTokens = 0;
  let totalCost = 0;
  const endpointCounts = {};

  logs.forEach(log => {
    totalTokens += log.totalTokens;
    totalCost += Number(log.cost || 0);
    
    if (log.endpoint) {
      endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;
    }
  });

  // Calculate top topics from logs (a rough estimate based on endpoints for now, or just dummy top topics if we don't have a specific text analysis)
  return {
    totalRequests: totalLogs,
    totalTokens,
    totalCost,
    endpointDistribution: endpointCounts,
    // Add dummy ratios since we don't do deep text analysis by default unless asked
    topicRatios: {
      "Hỗ trợ cấu hình": 45,
      "Hỏi đáp sản phẩm": 30,
      "Hỗ trợ chung": 25,
    }
  };
}
