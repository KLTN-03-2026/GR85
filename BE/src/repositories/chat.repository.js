import { prisma } from "../db/prisma.js";

// Fetch a single room with user and resolver metadata for admin/customer views.
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

// Reuse the current open room for a user when possible; otherwise create one.
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

// Persist a message and eagerly load sender/read data for the UI layer.
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

// Count messages in a room for pagination metadata.
export async function countMessagesByConversation(conversationId) {
  return prisma.message.count({
    where: { roomId: conversationId },
  });
}

// Return messages newest-first so the caller can render chat history.
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

// Mark all unread messages for a user as read using bulk inserts.
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
    // Safety cap to keep the operation bounded for very busy rooms.
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

// Update the room lifecycle status directly.
export async function updateRoomStatus({ roomId, status }) {
  return prisma.chatRoom.update({
    where: { id: roomId },
    data: { status },
  });
}

// Close a room and write resolver metadata in one transaction.
export async function markRoomDone({ roomId, adminUserId, customerVote = null }) {
  const doneAt = new Date();

  await prisma.$transaction(async (tx) => {
    // Mark the room as closed before saving the resolution metadata.
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

// Save the customer's feedback vote on the room resolution.
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

// List admin-facing rooms with the latest message preview and metadata.
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

// Count unread messages for an admin in a specific room.
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

// Load all moderation terms with active terms first.
export async function listModerationTerms() {
  return prisma.chatModerationTerm.findMany({
    orderBy: [{ isActive: "desc" }, { term: "asc" }],
  });
}

// Add a new moderation term as active by default.
export async function createModerationTerm(term) {
  return prisma.chatModerationTerm.create({
    data: {
      term,
      isActive: true,
    },
  });
}

// Remove a moderation term by primary key.
export async function deleteModerationTermById(id) {
  return prisma.chatModerationTerm.delete({
    where: { id },
  });
}

// Only fetch active moderation terms for filtering/chat validation.
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
