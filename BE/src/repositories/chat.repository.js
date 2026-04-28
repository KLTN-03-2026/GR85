import { prisma } from "../db/prisma.js";

export async function findConversationById(conversationId) {
  return prisma.chatRoom.findUnique({
    where: { id: conversationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      meta: {
        include: {
          resolver: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

export async function findOrCreateOpenConversationByUserId(userId) {
  const existing = await prisma.chatRoom.findFirst({
    where: {
      userId,
      status: "OPEN",
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (existing) {
    await prisma.chatRoomMeta.upsert({
      where: { roomId: existing.id },
      create: { roomId: existing.id },
      update: {},
    });

    return existing;
  }

  const room = await prisma.chatRoom.create({
    data: {
      userId,
      status: "OPEN",
    },
  });

  await prisma.chatRoomMeta.create({
    data: {
      roomId: room.id,
    },
  });

  return room;
}

export async function createMessage({ conversationId, senderId, content }) {
  return prisma.message.create({
    data: {
      roomId: conversationId,
      senderId,
      content,
    },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      reads: {
        select: {
          userId: true,
          readAt: true,
        },
      },
    },
  });
}

export async function countMessagesByConversation(conversationId) {
  return prisma.message.count({
    where: { roomId: conversationId },
  });
}

export async function listMessagesByConversation({
  conversationId,
  skip,
  take,
}) {
  return prisma.message.findMany({
    where: { roomId: conversationId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      reads: {
        select: {
          userId: true,
          readAt: true,
        },
      },
    },
  });
}

export async function markMessagesReadByUser({ conversationId, userId }) {
  const unreadMessages = await prisma.message.findMany({
    where: {
      roomId: conversationId,
      senderId: {
        not: userId,
      },
      reads: {
        none: {
          userId,
        },
      },
    },
    select: {
      id: true,
    },
    take: 2000,
  });

  if (unreadMessages.length === 0) {
    return { count: 0, messageIds: [] };
  }

  const rows = unreadMessages.map((item) => ({
    messageId: item.id,
    userId,
  }));

  await prisma.messageRead.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return { count: rows.length, messageIds: unreadMessages.map((m) => m.id) };
}

export async function updateRoomStatus({ roomId, status }) {
  return prisma.chatRoom.update({
    where: { id: roomId },
    data: { status },
  });
}

export async function markRoomDone({ roomId, adminUserId, customerVote = null }) {
  const doneAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.chatRoom.update({
      where: { id: roomId },
      data: {
        status: "CLOSED",
      },
    });

    await tx.chatRoomMeta.upsert({
      where: { roomId },
      create: {
        roomId,
        resolvedBy: adminUserId,
        resolvedAt: doneAt,
        customerVote,
      },
      update: {
        resolvedBy: adminUserId,
        resolvedAt: doneAt,
        customerVote,
      },
    });
  });

  return findConversationById(roomId);
}

export async function saveCustomerVote({ roomId, vote }) {
  return prisma.chatRoomMeta.upsert({
    where: { roomId },
    create: {
      roomId,
      customerVote: vote,
    },
    update: {
      customerVote: vote,
    },
    include: {
      resolver: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}

export async function listAdminRooms() {
  return prisma.chatRoom.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      meta: {
        include: {
          resolver: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          reads: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });
}

export async function countUnreadForAdmin(roomId, adminUserId) {
  return prisma.message.count({
    where: {
      roomId,
      senderId: {
        not: adminUserId,
      },
      reads: {
        none: {
          userId: adminUserId,
        },
      },
    },
  });
}

export async function listModerationTerms() {
  return prisma.chatModerationTerm.findMany({
    orderBy: [{ isActive: "desc" }, { term: "asc" }],
  });
}

export async function createModerationTerm(term) {
  return prisma.chatModerationTerm.create({
    data: {
      term,
      isActive: true,
    },
  });
}

export async function deleteModerationTermById(id) {
  return prisma.chatModerationTerm.delete({
    where: { id },
  });
}

export async function listActiveModerationTerms() {
  return prisma.chatModerationTerm.findMany({
    where: {
      isActive: true,
    },
    select: {
      term: true,
    },
  });
}
