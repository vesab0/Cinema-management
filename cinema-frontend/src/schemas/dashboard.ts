import { z } from 'zod'

export const roomSchema = z.object({
	name: z
		.string()
		.min(1, 'Room name is required')
		.max(100, 'Room name must not exceed 100 characters'),
	rows: z
		.number({ invalid_type_error: 'Rows must be a number' })
		.int()
		.min(1, 'At least 1 row')
		.max(50, 'Maximum 50 rows'),
	cols: z
		.number({ invalid_type_error: 'Cols must be a number' })
		.int()
		.min(1, 'At least 1 column')
		.max(50, 'Maximum 50 columns'),
})

export const scheduleEditSchema = z.object({
	movieName: z.string().min(1, 'Movie is required'),
	roomName: z.string().min(1, 'Room is required'),
	scheduleDay: z.string().min(1, 'Date is required'),
	startTime: z.string().min(1, 'Time is required'),
	isActive: z.boolean(),
})

export const rangeCreateSchema = z
	.object({
		movieName: z.string().min(1, 'Movie is required'),
		roomName: z.string().min(1, 'Room is required'),
		fromDate: z.string().min(1, 'From date is required'),
		toDate: z.string().min(1, 'To date is required'),
		price: z.number().min(0, 'Price must be ≥ 0').max(10000, 'Price must be ≤ 10,000'),
	})
	.refine((d) => d.fromDate <= d.toDate, {
		message: 'From date must be before or equal to to date',
		path: ['toDate'],
	})

export type RoomFormData = z.infer<typeof roomSchema>
export type ScheduleEditFormData = z.infer<typeof scheduleEditSchema>
export type RangeCreateFormData = z.infer<typeof rangeCreateSchema>
