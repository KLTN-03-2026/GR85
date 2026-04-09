import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserStatus } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { serializeData } from '../utils/serialize';

const defaultUserPermissions = ['place_order', 'save_build', 'send_review'];

type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  role: null | {
    name: string;
    permissions: Array<{
      permission: {
        actionName: string;
      };
    }>;
  };
};

export async function registerUser(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

  if (existingUser) {
    throw new Error('Email already exists');
  }

  const userRole = await prisma.role.findFirst({
    where: { name: { equals: 'User' } },
  });

  const passwordHash = await hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      status: UserStatus.ACTIVE,
      roleId: userRole?.id,
      cart: {
        create: {},
      },
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return buildAuthPayload(user);
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const passwordMatches = await compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error('Invalid email or password');
  }

  if (user.status === UserStatus.BANNED) {
    throw new Error('This account has been banned');
  }

  return buildAuthPayload(user);
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return serializeData({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    role: user.role?.name ?? 'User',
    permissions:
      user.role?.permissions.map((item) => item.permission.actionName) ?? defaultUserPermissions,
  });
}

function buildAuthPayload(user: AuthUser) {
  const permissions = user.role?.permissions.map((item) => item.permission.actionName) ?? defaultUserPermissions;

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role?.name ?? 'User',
      permissions,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' },
  );

  return serializeData({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      role: user.role?.name ?? 'User',
      permissions,
    },
  });
}
