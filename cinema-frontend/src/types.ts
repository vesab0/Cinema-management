export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type UserRole = "user" | "admin" | "staff";

export type UserRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  createdAt: string;
};

export type BackendUserResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  isActive: boolean;
};

export type UpdateUserPayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
};

export interface MovieRow {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  releaseDate: string;
  director: string;
  ageRating: string;
  posterUrl: string;
  trailerUrl: string;
  isActive: boolean;
  createdAt: string;
  genres: string[];
  cast: { fullName: string }[];
}

export type GenreOption = {
  id: string;
  name: string;
};

export type CastMemberOption = {
  id: string;
  fullName: string;
};

export type CreateMoviePayload = {
  name: string;
  description: string;
  durationMinutes: number;
  releaseDate: string;
  director: string;
  ageRating: string;
  posterUrl?: string;
  trailerUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  genreIds: string[];
  cast: { fullName: string }[];
};

export type UpdateMoviePayload = {
  name?: string;
  description?: string;
  durationMinutes?: number;
  releaseDate?: string;
  director?: string;
  ageRating?: string;
  posterUrl?: string;
  trailerUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  genreIds?: string[];
  cast?: { fullName: string }[];
};

export type SeatType = "Standard" | "VIP" | "Wheelchair";

export type SeatResponse = {
  id: string;
  rowLabel: string;
  colNumber: number;
  seatType: SeatType;
  isActive: boolean;
};

export type RoomRow = {
  [key: string]: unknown;
  id: string;
  name: string;
  rows: number;
  cols: number;
  isActive: boolean;
  createdAt: string;
};

export type RoomWithSeats = RoomRow & {
  seats: SeatResponse[];
};

export type CreateRoomPayload = {
  name: string;
  rows: number;
  cols: number;
};

export type UpdateRoomPayload = {
  name?: string;
  isActive?: boolean;
};

export type UpdateSeatPayload = {
  seatType?: SeatType;
  isActive?: boolean;
};

export type ScheduleRow = {
  [key: string]: unknown;
  id: string;
  movieId: string;
  movieName: string;
  roomId: string;
  roomName: string;
  scheduleDay: string;
  startTime: string;
  createdAt: string;
  isActive: boolean;
};

export type CreateSchedulePayload = {
  movieId: string;
  roomId: string;
  scheduleDay: string;
  startTime: string;
  isActive?: boolean;
};

export type UpdateSchedulePayload = {
  movieId?: string;
  roomId?: string;
  scheduleDay?: string;
  startTime?: string;
  isActive?: boolean;
};

export type MovieOption = {
  id: string;
  name: string;
};

export type RoomOption = {
  id: string;
  name: string;
};

