const ROLE_CLAIM_URI = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

type JwtPayload = {
  exp?: number;
  sub?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  role?: string | string[];
  roles?: string | string[];
  Role?: string | string[];
  Roles?: string | string[];
  [ROLE_CLAIM_URI]?: string | string[];
  [key: string]: unknown;
};

export function getAccessToken(): string | null {
  return localStorage.getItem("accessToken") ?? localStorage.getItem("token");
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const json = decodeBase64Url(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function extractRoles(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.flatMap((item) => extractRoles(item));
  }

  if (typeof input !== "string") {
    return [];
  }

  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getRoleClaims(payload: JwtPayload): string[] {
  const candidates: unknown[] = [
    payload[ROLE_CLAIM_URI],
    payload.role,
    payload.roles,
    payload.Role,
    payload.Roles,
  ];

  return candidates.flatMap((candidate) => extractRoles(candidate));
}

function isExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function isAdminToken(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || isExpired(payload)) return false;

  const roles = getRoleClaims(payload).map((r) => r.toLowerCase());
  return roles.includes("admin");
}

export function isAdminAuthenticated(): boolean {
  const token = getAccessToken();
  return token ? isAdminToken(token) : false;
}

export function getUserId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload || isExpired(payload)) return null;
  return typeof payload.sub === 'string' ? payload.sub : null;
}

export function isAuthenticated(): boolean {
  return getUserId() !== null;
}

export function getUserName(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload || isExpired(payload)) return null;
  const given = typeof payload.given_name === 'string' ? payload.given_name : '';
  const family = typeof payload.family_name === 'string' ? payload.family_name : '';
  return `${given} ${family}`.trim() || null;
}

export function getUserEmail(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  if (!payload || isExpired(payload)) return null;
  return typeof payload.email === 'string' ? payload.email : null;
}
