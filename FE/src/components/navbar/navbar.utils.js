export function buildPermissionSet(permissions) {
  return new Set(
    (Array.isArray(permissions) ? permissions : [])
      .map((item) => String(item ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
}

export function canAccessAdminTab(requiredPermission, permissionSet, isSuperAdmin) {
  if (!requiredPermission || isSuperAdmin) {
    return true;
  }

  return permissionSet.has(String(requiredPermission ?? "").toLowerCase());
}

export function getInitials(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function isAdminRole(role) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .includes("admin");
}