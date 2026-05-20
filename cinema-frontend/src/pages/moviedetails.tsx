import React from 'react'
import MovieDetails from '../components/MovieDetails'
import MovieSchedules from '../components/MovieSchedules'
import { useParams } from 'react-router-dom'

export default function MovieDetailsPage() {
  const params = useParams()
  const movieId = (params as any)?.id

  return (
    <div className="min-h-screen bg-stage">
      <MovieDetails />
      <div className="mx-auto max-w-5xl px-6 pb-10">
        <MovieSchedules movieId={movieId} />
      </div>
    </div>
  )
}
