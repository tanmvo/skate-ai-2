'use client'

import { signIn, useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState, useEffect } from "react"
import { useAnalytics } from "@/lib/analytics/hooks/use-analytics"

export default function SignUpPage() {
  const { data: session } = useSession()
  const analytics = useAnalytics()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Track page visit
  useEffect(() => {
    analytics.trackAuthPageVisit('signup')
  }, [analytics])

  if (session) {
    redirect('/')
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Track form submission attempt
    analytics.trackAuthMethodAttempt('email', 'submit', 'signup')

    // Client-side validation
    if (!name.trim()) {
      const errorMsg = 'Name is required'
      setError(errorMsg)
      analytics.trackValidationError('name', errorMsg, 'signup')
      setIsLoading(false)
      return
    }

    if (!email.trim()) {
      const errorMsg = 'Email is required'
      setError(errorMsg)
      analytics.trackValidationError('email', errorMsg, 'signup')
      setIsLoading(false)
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      const errorMsg = 'Please enter a valid email address'
      setError(errorMsg)
      analytics.trackValidationError('email', errorMsg, 'signup')
      setIsLoading(false)
      return
    }

    if (!password) {
      const errorMsg = 'Password is required'
      setError(errorMsg)
      analytics.trackValidationError('password', errorMsg, 'signup')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      const errorMsg = 'Password must be at least 8 characters'
      setError(errorMsg)
      analytics.trackValidationError('password', errorMsg, 'signup')
      setIsLoading(false)
      return
    }

    if (!/(?=.*[a-zA-Z])/.test(password)) {
      const errorMsg = 'Password must contain at least one letter'
      setError(errorMsg)
      analytics.trackValidationError('password', errorMsg, 'signup')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      const errorMsg = 'Passwords do not match'
      setError(errorMsg)
      analytics.trackValidationError('password', errorMsg, 'signup')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to create account'
        setError(errorMsg)
        analytics.trackAuthError('email', 'signup_api_error', errorMsg, 'signup')
        return
      }

      // Track successful signup
      analytics.trackAuthSuccess('email', 'signup')

      // Auto sign in after successful signup
      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        const errorMsg = 'Account created but sign in failed. Please try signing in manually.'
        setError(errorMsg)
        analytics.trackAuthError('email', 'auto_signin_failed', errorMsg, 'signup')
      } else {
        redirect('/')
      }
    } catch (error) {
      console.error('Signup error:', error)
      const errorMsg = 'Network error. Please check your connection and try again.'
      setError(errorMsg)
      analytics.trackAuthError('email', 'network_error', errorMsg, 'signup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = () => {
    analytics.trackAuthMethodAttempt('google', 'click', 'signup')
    signIn('google', { callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Skate AI
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account to get started
          </p>
        </div>

        <div className="space-y-4">
          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignUp}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Sign up with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or create account with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/auth/signin" className="text-indigo-600 hover:text-indigo-500">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}