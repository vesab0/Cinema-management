

import React from 'react'

import { Link } from 'react-router-dom'

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-stage text-white p-4">
            <h1 className="text-7xl font-bold">404</h1>
            <p className="mt-4 text-xl"> Page Not Found</p>
            <Link to="/" className="mt-6 px-4 py-2 bg-white text-black rounded"> Go Back To Home</Link>

        </div>


    )


}
