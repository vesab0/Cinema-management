import { api } from './api'
import { useAuthStore } from './store/authStore'

export type { User } from './store/authStore'

const ROLE_CLAIM_URI =
	'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

type JwtPayload = {
	exp?: number
	sub?: string
	email?: string
	given_name?: string
	family_name?: string
	role?: string | string[]
	roles?: string | string[]
	Role?: string | string[]
	Roles?: string | string[]
	[ROLE_CLAIM_URI]?: string | string[]
	[key: string]: unknown
}

function decodeBase64Url(input: string): string {
	const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
	const padded = normalized.padEnd(
		Math.ceil(normalized.length / 4) * 4,
		'=',
	)
	return atob(padded)
}

function parseJwtPayload(token: string): JwtPayload | null {
	const parts = token.split('.')
	if (parts.length < 2) return null
	try {
		return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload
	} catch {
		return null
	}
}

function extractRoles(input: unknown): string[] {
	if (!input) return []
	if (Array.isArray(input)) return input.flatMap(extractRoles)
	if (typeof input !== 'string') return []
	return input.split(',').map((p) => p.trim()).filter(Boolean)
}

function getRoleClaims(payload: JwtPayload): string[] {
	const candidates: unknown[] = [
		payload[ROLE_CLAIM_URI],
		payload.role,
		payload.roles,
		payload.Role,
		payload.Roles,
	]
	return candidates.flatMap(extractRoles)
}

function isExpired(payload: JwtPayload): boolean {
	if (!payload.exp) return true
	return Date.now() >= payload.exp * 1000
}

// Non-reactive accessors — use useAuthStore() hook in components instead
export function getAccessToken(): string | null {
	return useAuthStore.getState().accessToken
}

export function setAccessToken(token: string | null): void {
	const { user } = useAuthStore.getState()
	useAuthStore.getState().setAuth(user, token)
}

export function getUser() {
	return useAuthStore.getState().user
}

export function setUser(user: ReturnType<typeof getUser>): void {
	const { accessToken } = useAuthStore.getState()
	useAuthStore.getState().setAuth(user, accessToken)
}

export function getUserId(): string | null {
	const token = getAccessToken()
	if (!token) return null
	const payload = parseJwtPayload(token)
	if (!payload || isExpired(payload)) return null
	return typeof payload.sub === 'string' ? payload.sub : null
}

export function isAuthenticated(): boolean {
	return getUserId() !== null
}

export function isAdmin(): boolean {
	const token = getAccessToken()
	if (!token) return false
	const payload = parseJwtPayload(token)
	if (!payload || isExpired(payload)) return false
	return getRoleClaims(payload).map((r) => r.toLowerCase()).includes('admin')
}

export function isAdminAuthenticated(): boolean {
	return isAdmin()
}

export function getUserName(): string | null {
	const user = getUser()
	if (user) {
		return `${user.firstName} ${user.lastName}`.trim() || user.email || null
	}
	const token = getAccessToken()
	if (!token) return null
	const payload = parseJwtPayload(token)
	if (!payload || isExpired(payload)) return null
	const given = typeof payload.given_name === 'string' ? payload.given_name : ''
	const family = typeof payload.family_name === 'string' ? payload.family_name : ''
	return `${given} ${family}`.trim() || null
}

export function getUserEmail(): string | null {
	const user = getUser()
	if (user) return user.email
	const token = getAccessToken()
	if (!token) return null
	const payload = parseJwtPayload(token)
	if (!payload || isExpired(payload)) return null
	return typeof payload.email === 'string' ? payload.email : null
}

export async function fetchCurrentUser() {
	try {
		const { data } = await api.get('/auth/me')
		const user = data as ReturnType<typeof getUser>
		useAuthStore.getState().setAuth(user, getAccessToken())
		return user
	} catch {
		useAuthStore.getState().clearAuth()
		delete api.defaults.headers.common.Authorization
		return null
	}
}

let _bootstrapPromise: Promise<ReturnType<typeof getUser>> | null = null

export async function bootstrapSession() {
	if (_bootstrapPromise) return _bootstrapPromise

	_bootstrapPromise = (async () => {
		const currentToken = getAccessToken()
		if (currentToken) {
			const user = await fetchCurrentUser()
			if (user) return user
		}

		try {
			const { data } = await api.post('/auth/refresh')
			setAccessToken(data.accessToken)
			api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
			return await fetchCurrentUser()
		} catch {
			useAuthStore.getState().clearAuth()
			delete api.defaults.headers.common.Authorization
			return null
		} finally {
			_bootstrapPromise = null
			useAuthStore.getState().setBootstrapped(true)
		}
	})()

	return _bootstrapPromise
}

export async function logout(): Promise<void> {
	try {
		await api.post('/auth/logout')
	} catch {
		// ignore
	}
	useAuthStore.getState().clearAuth()
	delete api.defaults.headers.common.Authorization
}
