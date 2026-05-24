import axios from 'axios'
import type {
  BackendUserResponse,
  CastMemberOption,
  CreateMoviePayload,
  CreateRoomPayload,
  CreateSchedulePayload,
  CreateTicketPayload,
  FavoriteMovieResponse,
  GenreOption,
  LoginPayload,
  MovieRow,
  MovieOption,
  PurchaseTicketPayload,
  PurchaseMultiTicketPayload,
  CreateMultiPaymentIntentPayload,
  MultiPaymentIntentResponse,
  RegisterPayload,
  RoomOption,
  RoomRow,
  RoomWithSeats,
  ScheduleRow,
  TicketRow,
  UpdateMoviePayload,
  UpdateRoomPayload,
  UpdateSchedulePayload,
  UpdateSeatPayload,
  UpdateTicketPayload,
  UpdateUserPayload,
  UserRole,
  UserRow,
  UserTicketRow,
} from './types'
import { fetchCurrentUser, getAccessToken, setAccessToken, setUser } from './auth'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
const PREDICTOR_URL = import.meta.env.VITE_PREDICTOR_URL ?? 'http://localhost:8000'

export const predictorApi = axios.create({
  baseURL: PREDICTOR_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (
        url.includes('/auth/me') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/login') ||
        url.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.accessToken;
        setAccessToken(newAccessToken);
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        onRefreshed(newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        setUser(null);
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: (payload: RegisterPayload) => api.post('/auth/register', payload),

  login: async (payload: LoginPayload) => {
    const { data } = await api.post('/auth/login', payload)
    setAccessToken(data.accessToken)
    api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
    await fetchCurrentUser()
    return data
  },

  googleLogin: async (credential: string) => {
    const { data } = await api.post('/auth/google', { credential })
    setAccessToken(data.accessToken)
    api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
    await fetchCurrentUser()
    return data
  },

  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

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
  return { firstName, lastName, phone: row.phone, role: row.role }
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

  async updateProfile(id: string, payload: UpdateUserPayload): Promise<void> {
    await api.put(`/api/users/${id}`, payload, { headers: getAuthHeaders() })
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/users/${id}`, {
      headers: getAuthHeaders(),
    })
  },
}

export const moviesApi = {
  list: () => api.get('/api/movies').then((r) => r.data),
  getById: (id: string) => api.get(`/api/movies/${id}`).then((r) => r.data),
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
  uploadImage: async (file: File, type?: 'avatar' | 'poster'): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const params = type ? `?type=${type}` : ''
    const { data } = await api.post<{ url: string }>(`/api/uploads/image${params}`, formData, {
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

export const schedulesApi = {
  list: () => api.get<ScheduleRow[]>('/api/schedules', { headers: getAuthHeaders() }).then(r => r.data),
  getById: (id: string) => api.get<ScheduleRow>(`/api/schedules/${id}`, { headers: getAuthHeaders() }).then(r => r.data),
  create: (payload: CreateSchedulePayload) => api.post<ScheduleRow>('/api/schedules', payload, { headers: getAuthHeaders() }).then(r => r.data),
  update: (id: string, payload: UpdateSchedulePayload) => api.put<ScheduleRow>(`/api/schedules/${id}`, payload, { headers: getAuthHeaders() }).then(r => r.data),
  remove: (id: string) => api.delete(`/api/schedules/${id}`, { headers: getAuthHeaders() }),
  getByDate: (date: string) => api.get<ScheduleRow[]>(`/api/schedules/date/${date}`, { headers: getAuthHeaders() }).then(r => r.data),
  getByMovie: (movieId: string) => api.get<ScheduleRow[]>(`/api/schedules/movie/${movieId}`, { headers: getAuthHeaders() }).then(r => r.data),
}

export const movieSearchApi = {
  search: (q: string, limit = 20) =>
    predictorApi.get<import('./types').PredictorMovie[]>('/search', { params: { q, limit } }).then(r => r.data),
  list: (limit = 9999) =>
    predictorApi.get<import('./types').PredictorMovie[]>('/browse', { params: { limit } }).then(r => r.data),
}

export const ticketsApi = {
  list: () => api.get<TicketRow[]>('/api/tickets', { headers: getAuthHeaders() }).then(r => r.data),
  getBySchedule: (scheduleId: string) => api.get<TicketRow[]>(`/api/tickets/schedule/${scheduleId}`, { headers: getAuthHeaders() }).then(r => r.data),
  getById: (id: string) => api.get<TicketRow>(`/api/tickets/${id}`, { headers: getAuthHeaders() }).then(r => r.data),
  create: (payload: CreateTicketPayload) => api.post<TicketRow>('/api/tickets', payload, { headers: getAuthHeaders() }).then(r => r.data),
  generate: (scheduleId: string, price: number) => api.post<{ created: number }>(`/api/tickets/generate/${scheduleId}?price=${price}`, null, { headers: getAuthHeaders() }).then(r => r.data),
  update: (id: string, payload: UpdateTicketPayload) => api.put<TicketRow>(`/api/tickets/${id}`, payload, { headers: getAuthHeaders() }).then(r => r.data),
  remove: (id: string) => api.delete(`/api/tickets/${id}`, { headers: getAuthHeaders() }),
}

export const userTicketsApi = {
  list: () => api.get<UserTicketRow[]>('/api/user-tickets', { headers: getAuthHeaders() }).then(r => r.data),
  getById: (id: string) => api.get<UserTicketRow>(`/api/user-tickets/${id}`, { headers: getAuthHeaders() }).then(r => r.data),
  getByConfirmationCode: (code: string) => api.get<UserTicketRow>(`/api/user-tickets/confirm/${code}`, { headers: getAuthHeaders() }).then(r => r.data),
  purchase: (payload: PurchaseTicketPayload) => api.post<UserTicketRow>('/api/user-tickets/purchase', payload, { headers: getAuthHeaders() }).then(r => r.data),
  cancel: (id: string) => api.delete(`/api/user-tickets/${id}`, { headers: getAuthHeaders() }),
  purchaseMulti: (payload: PurchaseMultiTicketPayload) =>
    api.post<UserTicketRow[]>('/api/user-tickets/purchase-multi', payload, { headers: getAuthHeaders() }).then(r => r.data),
}

export const stripeApi = {
  createMultiPaymentIntent: (payload: CreateMultiPaymentIntentPayload) =>
    api.post<MultiPaymentIntentResponse>('/api/stripe/create-multi-payment-intent', payload, { headers: getAuthHeaders() }).then(r => r.data),
}

export const favoritesApi = {
  list: (userId: string) =>
    api.get<FavoriteMovieResponse[]>(`/api/users/${userId}/favorites`, { headers: getAuthHeaders() }).then(r => r.data),
  add: (userId: string, tmdbId: number, movieTitle: string, posterPath: string) =>
    api.post<FavoriteMovieResponse>(`/api/users/${userId}/favorites`, { tmdbId, movieTitle, posterPath }, { headers: getAuthHeaders() }).then(r => r.data),
  remove: (userId: string, tmdbId: number) =>
    api.delete(`/api/users/${userId}/favorites/${tmdbId}`, { headers: getAuthHeaders() }),
}

export default api
