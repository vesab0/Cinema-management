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
  avatarPath?: string;
  role: string;
  createdAt: string;
  isActive: boolean;
};

export type UpdateUserPayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarPath?: string;
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
  tmdbId?: number;
}

export type PredictorMovie = {
  movieLensId: number;
  tmdbId: number;
  title: string;
  genres: string[];
  releaseDate: string;
  voteAverage: number;
  posterPath: string;
  posterUrl: string;
};

export type FavoriteMovieResponse = {
  favoriteId: string;
  tmdbId: number;
  movieTitle: string;
  posterPath: string;
  addedAt: string;
};

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
  ticketPrice: number;
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

export type TicketStatus = "Available" | "Sold";

export interface TicketRow {
  [key: string]: unknown;
  id: string;
  scheduleId: string;
  movieName: string;
  scheduleDay: string;
  startTime: string;
  seatId: string;
  rowLabel: string;
  colNumber: number;
  seatType: string;
  price: number;
  status: TicketStatus;
  createdAt: string;
}

export interface UserTicketRow {
  [key: string]: unknown;
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  ticketId: string;
  movieName: string;
  scheduleDay: string;
  startTime: string;
  roomName: string;
  rowLabel: string;
  colNumber: number;
  seatType: string;
  price: number;
  confirmationCode: string;
  isUsed: boolean;
  purchasedAt: string;
}

export type CreateTicketPayload = {
  scheduleId: string;
  seatId: string;
  price: number;
};

export type UpdateTicketPayload = {
  price?: number;
  status?: TicketStatus;
};

export type PurchaseTicketPayload = {
  userId: string;
  ticketId: string;
};

