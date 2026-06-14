import crypto from "crypto";
import { NextResponse } from "next/server";
import { loadUsers, saveUsers, loadSessions, saveSessions } from "./storage";
import type { UserRecord, SessionRecord } from "./storage";

const SESSION_COOKIE_NAME = "session_token";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");
  return `pbkdf2_sha512$120000$${salt}$${hash}`;
}

function verifyPasswordInternal(password: string, storedHash: string): boolean {
  const [algorithm, iterationsStr, salt, hash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha512") return false;
  const iterations = Number(iterationsStr);
  const computed = crypto
    .pbkdf2Sync(password, salt, iterations, 64, "sha512")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
}

function getCookieValue(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") || "";
  for (const cookie of raw.split("; ")) {
    const [key, ...value] = cookie.split("=");
    if (key === name) {
      return value.join("=");
    }
  }
  return null;
}

function makeSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function registerUser(name: string, email: string, password: string): Promise<UserRecord> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await loadUsers();
  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("Email already exists");
  }

  const user: UserRecord = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    created_at: new Date().toISOString(),
  };

  users.push(user);
  await saveUsers(users);
  return user;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  const users = await loadUsers();
  return users.find((user) => user.email === normalizedEmail);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return verifyPasswordInternal(password, storedHash);
}

export async function createSession(userId: string): Promise<string> {
  const sessions = await loadSessions();
  const token = crypto.randomBytes(32).toString("hex");
  sessions.push({ token, userId, created_at: new Date().toISOString() });
  await saveSessions(sessions);
  return token;
}

export async function getSessionUser(token: string): Promise<UserRecord | null> {
  if (!token) return null;
  const sessions = await loadSessions();
  const session = sessions.find((item) => item.token === token);
  if (!session) return null;
  const users = await loadUsers();
  return users.find((user) => user.id === session.userId) ?? null;
}

export async function getCurrentUser(request: Request): Promise<UserRecord | null> {
  const token = getCookieValue(request, SESSION_COOKIE_NAME);
  return token ? getSessionUser(token) : null;
}

export async function requireAuth(request: Request): Promise<UserRecord> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });
  }
  return user;
}

export async function createAuthResponse(user: UserRecord): Promise<NextResponse> {
  const res = NextResponse.json({ user: { name: user.name, email: user.email } });
  const token = await createSession(user.id);
  makeSessionCookie(res, token);
  return res;
}

export function createLogoutResponse(): NextResponse {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
