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
