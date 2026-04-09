export function normalizeAndValidateFullName(value, fieldLabel = "Full name") {
  const fullName = String(value ?? "").trim().replace(/\s+/g, " ");

  if (!fullName) {
    throw new Error(`${fieldLabel} is required`);
  }

  if (fullName.length < 2 || fullName.length > 100) {
    throw new Error(`${fieldLabel} must be between 2 and 100 characters`);
  }

  if (/\d/.test(fullName)) {
    throw new Error(`${fieldLabel} cannot contain numbers`);
  }

  return fullName;
}

export function normalizeAndValidatePhoneNumber(
  value,
  {
    required = false,
    fieldLabel = "Phone number",
  } = {},
) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    if (required) {
      throw new Error(`${fieldLabel} is required`);
    }
    return null;
  }

  const digits = raw.replace(/\D/g, "");
  if (!/^\d{10}$/.test(digits)) {
    throw new Error(`${fieldLabel} must contain exactly 10 digits`);
  }

  return digits;
}