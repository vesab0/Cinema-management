import axios from 'axios'
import type {
  BackendUserResponse,
  CastMemberOption,
  CreateMoviePayload,
  CreateRoomPayload,
  GenreOption,
  LoginPayload,
  MovieRow,
  RegisterPayload,
  RoomRow,
  RoomWithSeats,
  UpdateMoviePayload,
  UpdateRoomPayload,
  UpdateSeatPayload,
  UpdateUserPayload,
  UserRole,
  UserRow
} from './types'
import { getAccessToken } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const allowedRoles: UserRole[] = ['user', 'admin', 'staff']

function getAuthHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function normalizeRole(role: string | undefined): UserRole {
  if (!role) return 'user'
  const match = allowedRoles.find((r) => r.toLowerCase() === role.toLowerCase())
  return match ?? 'user'
}

function toUserRow(user: BackendUserResponse): UserRow {
  return {
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone ?? '',
    role: normalizeRole(user.role),
    createdAt: user.createdAt?.split('T')[0] ?? '',
  }
}

function toUpdatePayload(row: UserRow): UpdateUserPayload {
  const parts = row.fullName.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ''
  const lastName = parts.slice(1).join(' ')
  return {
    firstName,
    lastName,
    phone: row.phone,
    role: row.role,
  }
}

export const authApi = {
  register: (payload: RegisterPayload) => api.post('/auth/register', payload),
  login: (payload: LoginPayload) => api.post('/auth/login', payload),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
}

export const usersApi = {
  async list(): Promise<UserRow[]> {
    const { data } = await api.get<BackendUserResponse[]>('/api/users', {
      headers: getAuthHeaders(),
    })
    return data.map(toUserRow)
  },

  async update(row: UserRow): Promise<void> {
    await api.put(`/api/users/${row.id}`, toUpdatePayload(row), {
      headers: getAuthHeaders(),
    })
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/users/${id}`, {
      headers: getAuthHeaders(),
    })
  },
}

export const moviesApi = {
  list: () => api.get('/api/movies').then((r) => r.data),
  update: (id: string, payload: UpdateMoviePayload) => api.put(`/api/movies/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/movies/${id}`),
  create: (payload: CreateMoviePayload) => api.post('/api/movies', payload).then((r) => r.data),
}

export const genresApi = {
  list: () => api.get<GenreOption[]>('/api/genres').then((r) => r.data),
  create: (name: string) => api.post<GenreOption>('/api/genres', { name }).then((r) => r.data),
}

export const castMembersApi = {
  list: () => api.get<CastMemberOption[]>('/api/cast-members').then((r) => r.data),
  create: (fullName: string) => api.post<CastMemberOption>('/api/cast-members', { fullName }).then((r) => r.data),
}

export const uploadsApi = {
  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post<{ url: string }>('/api/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url
  },
}

export const roomsApi = {
  list: () => api.get<RoomRow[]>('/api/rooms', { headers: getAuthHeaders() }).then(r => r.data),
  getById: (id: string) => api.get<RoomWithSeats>(`/api/rooms/${id}`, { headers: getAuthHeaders() }).then(r => r.data),
  create: (payload: CreateRoomPayload) => api.post<RoomWithSeats>('/api/rooms', payload, { headers: getAuthHeaders() }).then(r => r.data),
  update: (id: string, payload: UpdateRoomPayload) => api.put<RoomRow>(`/api/rooms/${id}`, payload, { headers: getAuthHeaders() }).then(r => r.data),
  remove: (id: string) => api.delete(`/api/rooms/${id}`, { headers: getAuthHeaders() }),
  updateSeat: (roomId: string, seatId: string, payload: UpdateSeatPayload) =>
    api.patch(`/api/rooms/${roomId}/seats/${seatId}`, payload, { headers: getAuthHeaders() }),
}

export default api
