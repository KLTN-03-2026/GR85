import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { adminPermissionCatalog } from "../services/admin.service.js";

const SUPER_ADMIN_EMAIL = "admin@gmail.com";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Thiếu token Bearer" });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const userId = Number(payload?.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

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
      return res.status(401).json({ message: "User not found" });
    }

    const permissions = resolveEffectivePermissions(user);
    const role = resolveDisplayRoleFromPermissions(user, permissions);

    req.auth = {
      ...payload,
      sub: user.id,
      role,
      permissions,
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    const userId = Number(payload?.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      return next();
    }

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

    if (user) {
      const permissions = resolveEffectivePermissions(user);
      const role = resolveDisplayRoleFromPermissions(user, permissions);

      req.auth = {
        ...payload,
        sub: user.id,
        role,
        permissions,
      };
    }

    return next();
  } catch {
    return next();
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    if (
      isAdminRole(req.auth.role) ||
      req.auth.permissions.includes(permission)
    ) {
      return next();
    }

    return res.status(403).json({ message: "Không có quyền truy cập" });
  };
}

function isAdminRole(role) {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  return normalizedRole.includes("admin") || normalizedRole.includes("quan tri");
}

function resolveEffectivePermissions(user) {
  if (String(user?.email ?? "").trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
    return adminPermissionCatalog.map((item) => item.actionName);
  }

  return Array.from(
    new Set(user?.role?.permissions?.map((item) => item.permission.actionName) ?? []),
  );
}

function resolveDisplayRoleFromPermissions(user, permissions = []) {
  const baseRole = String(user?.role?.name ?? "User").trim() || "User";

  if (String(user?.email ?? "").trim().toLowerCase() === SUPER_ADMIN_EMAIL) {
    return "Admin";
  }

  if (
    (Array.isArray(permissions) ? permissions : []).some((item) =>
      String(item ?? "").toLowerCase().startsWith("admin_"),
    )
  ) {
    return "Admin";
  }

  return baseRole;
}
