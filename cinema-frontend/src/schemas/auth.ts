import { z } from 'zod'

export const loginSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Enter a valid email address'),
	password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
	firstName: z
		.string()
		.min(1, 'First name is required')
		.max(100, 'First name must not exceed 100 characters'),
	lastName: z
		.string()
		.min(1, 'Last name is required')
		.max(100, 'Last name must not exceed 100 characters'),
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Enter a valid email address')
		.max(255, 'Email must not exceed 255 characters'),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.max(128, 'Password must not exceed 128 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
