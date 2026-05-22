import { create } from 'zustand'

export type User = {
	id: string
	email: string
	firstName: string
	lastName: string
	avatarPath?: string | null
	roles: string[]
	isActive: boolean
}

interface AuthState {
	user: User | null
	accessToken: string | null
	isBootstrapped: boolean
	setAuth: (user: User | null, accessToken: string | null) => void
	clearAuth: () => void
	setBootstrapped: (value: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	accessToken: null,
	isBootstrapped: false,
	setAuth: (user, accessToken) => set({ user, accessToken }),
	clearAuth: () => set({ user: null, accessToken: null }),
	setBootstrapped: (isBootstrapped) => set({ isBootstrapped }),
}))
