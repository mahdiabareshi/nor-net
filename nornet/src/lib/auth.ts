// AUTH — احراز هویت ساده و امن: هش scrypt + کوکی امضاشده (HMAC)
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me'
const COOKIE = 'nrt_session'
const MAX_AGE = 60 * 60 * 24 * 7 // یک هفته

export interface SessionPayload {
  userId: string
  username: string
  role: string
  exp: number
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return salt + ':' + hash
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = scryptSync(password, salt, 64)
  const real = Buffer.from(hash, 'hex')
  return test.length === real.length && timingSafeEqual(test, real)
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function makeToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return body + '.' + sign(body)
}

export function readToken(token: string | undefined): SessionPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  if (sign(body) !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export async function setSession(payload: Omit<SessionPayload, 'exp'>) {
  const store = await cookies()
  const full: SessionPayload = { ...payload, exp: Date.now() + MAX_AGE * 1000 }
  store.set(COOKIE, makeToken(full), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function clearSession() {
  const store = await cookies()
  store.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  return readToken(store.get(COOKIE)?.value)
}
