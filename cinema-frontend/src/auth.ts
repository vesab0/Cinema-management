import { api } from './api'

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

export type User = {
	id: string
	email: string
	firstName: string
	lastName: string
	roles: string[]
	isActive: boolean
}

let _accessToken: string | null = null
let _user: User | null = null
let _bootstrapPromise: Promise<User | null> | null = null

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

	if (parts.length < 2) {
		return null
	}

	try {
		return JSON.parse(decodeBase64Url(parts[1])) as JwtPayload
	} catch {
		return null
	}
}

function extractRoles(input: unknown): string[] {
	if (!input) {
		return []
	}

	if (Array.isArray(input)) {
		return input.flatMap((item) => extractRoles(item))
	}

	if (typeof input !== 'string') {
		return []
	}

	return input
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
}

function getRoleClaims(payload: JwtPayload): string[] {
	const candidates: unknown[] = [
		payload[ROLE_CLAIM_URI],
		payload.role,
		payload.roles,
		payload.Role,
		payload.Roles,
	]

	return candidates.flatMap((candidate) =>
		extractRoles(candidate),
	)
}

function isExpired(payload: JwtPayload): boolean {
	if (!payload.exp) {
		return true
	}

	return Date.now() >= payload.exp * 1000
}

export function getAccessToken(): string | null {
	return _accessToken
}

export function setAccessToken(token: string | null): void {
	_accessToken = token
}

export function getUser(): User | null {
	return _user
}

export function setUser(user: User | null): void {
	_user = user
}

export function getUserId(): string | null {
	const token = _accessToken

	if (!token) {
		return null
	}

	const payload = parseJwtPayload(token)

	if (!payload || isExpired(payload)) {
		return null
	}

	return typeof payload.sub === 'string'
		? payload.sub
		: null
}

export function isAuthenticated(): boolean {
	return getUserId() !== null
}

export function isAdmin(): boolean {
	const token = _accessToken

	if (!token) {
		return false
	}

	const payload = parseJwtPayload(token)

	if (!payload || isExpired(payload)) {
		return false
	}

	const roles = getRoleClaims(payload).map((role) =>
		role.toLowerCase(),
	)

	return roles.includes('admin')
}

export function isAdminAuthenticated(): boolean {
	return isAdmin()
}

export function getUserName(): string | null {
	if (_user) {
		const fullName =
			`${_user.firstName} ${_user.lastName}`.trim()

		return fullName || _user.email || null
	}

	const token = _accessToken

	if (!token) {
		return null
	}

	const payload = parseJwtPayload(token)

	if (!payload || isExpired(payload)) {
		return null
	}

	const given =
		typeof payload.given_name === 'string'
			? payload.given_name
			: ''

	const family =
		typeof payload.family_name === 'string'
			? payload.family_name
			: ''

	return `${given} ${family}`.trim() || null
}

export function getUserEmail(): string | null {
	if (_user) {
		return _user.email
	}

	const token = _accessToken

	if (!token) {
		return null
	}

	const payload = parseJwtPayload(token)

	if (!payload || isExpired(payload)) {
		return null
	}

	return typeof payload.email === 'string'
		? payload.email
		: null
}

export async function fetchCurrentUser(): Promise<User | null> {
	try {
		const { data } = await api.get('/auth/me')

		_user = data as User

		return _user
	} catch {
		_user = null
		_accessToken = null

		return null
	}
}

function clearAuthState(): void {
	_accessToken = null
	_user = null
	delete api.defaults.headers.common.Authorization
}

export async function bootstrapSession(): Promise<User | null> {
	if (_bootstrapPromise) {
		return _bootstrapPromise
	}

	_bootstrapPromise = (async () => {
		if (_accessToken) {
			const currentUser = await fetchCurrentUser()
			if (currentUser) {
				return currentUser
			}
		}

		try {
			const { data } = await api.post('/auth/refresh')
			setAccessToken(data.accessToken)
			api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
			return await fetchCurrentUser()
		} catch {
			clearAuthState()
			return null
		} finally {
			_bootstrapPromise = null
		}
	})()

	return _bootstrapPromise
}

export async function logout(): Promise<void> {
	try {
		await api.post('/auth/logout')
	} catch {
	}

	clearAuthState()
}