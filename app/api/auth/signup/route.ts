import { NextRequest, NextResponse } from "next/server"
import { createUserWithPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkBasicRateLimit, RATE_LIMITS } from "@/lib/basic-rate-limit"
import { trackAuthSuccess, trackAuthError, trackRateLimit, getEmailDomain, categorizeAuthError } from "@/lib/analytics/auth-tracking"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    const rateCheck = await checkBasicRateLimit(
      `signup:${ip}`,
      RATE_LIMITS.SIGNUP.limit,
      RATE_LIMITS.SIGNUP.window
    )

    if (!rateCheck.allowed) {
      // Track rate limiting
      await trackRateLimit('signup', {
        ip_address: ip,
        attempts_count: RATE_LIMITS.SIGNUP.limit,
        window_seconds: RATE_LIMITS.SIGNUP.window,
      })

      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        {
          status: 429,
          headers: { 'Retry-After': '3600' } // 1 hour
        }
      )
    }

    const body = await request.json()
    const { name, email, password } = body

    // Enhanced validation
    if (!email || !password) {
      const errorMessage = "Email and password are required"
      const field = !email ? "email" : "password"

      await trackAuthError('auth_signup_error', {
        error_type: 'validation_failed',
        error_message: errorMessage,
        auth_method: 'email',
        field: field as 'email' | 'password',
        ip_address: ip,
      })

      return NextResponse.json(
        { error: errorMessage, field },
        { status: 400 }
      )
    }

    if (!name || name.trim().length === 0) {
      const errorMessage = "Name is required"

      await trackAuthError('auth_signup_error', {
        error_type: 'validation_failed',
        error_message: errorMessage,
        auth_method: 'email',
        field: 'name',
        ip_address: ip,
      })

      return NextResponse.json(
        { error: errorMessage, field: "name" },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      const errorMessage = "Please enter a valid email address"

      await trackAuthError('auth_signup_error', {
        error_type: 'validation_failed',
        error_message: errorMessage,
        auth_method: 'email',
        field: 'email',
        ip_address: ip,
      })

      return NextResponse.json(
        { error: errorMessage, field: "email" },
        { status: 400 }
      )
    }

    // Password validation
    if (password.length < 8) {
      const errorMessage = "Password must be at least 8 characters"

      await trackAuthError('auth_signup_error', {
        error_type: 'validation_failed',
        error_message: errorMessage,
        auth_method: 'email',
        field: 'password',
        ip_address: ip,
      })

      return NextResponse.json(
        { error: errorMessage, field: "password" },
        { status: 400 }
      )
    }

    // Additional password strength (optional)
    if (!/(?=.*[a-zA-Z])/.test(password)) {
      const errorMessage = "Password must contain at least one letter"

      await trackAuthError('auth_signup_error', {
        error_type: 'validation_failed',
        error_message: errorMessage,
        auth_method: 'email',
        field: 'password',
        ip_address: ip,
      })

      return NextResponse.json(
        { error: errorMessage, field: "password" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (existingUser) {
      const errorMessage = "An account with this email already exists. Please sign in instead."

      await trackAuthError('auth_signup_error', {
        error_type: 'duplicate_email',
        error_message: errorMessage,
        auth_method: 'email',
        field: 'email',
        ip_address: ip,
      })

      return NextResponse.json(
        { error: errorMessage, field: "email" },
        { status: 400 }
      )
    }

    // Create user with normalized email
    const user = await createUserWithPassword(
      email.toLowerCase().trim(),
      password,
      name.trim()
    )

    // Track successful signup
    await trackAuthSuccess('auth_signup_success', {
      method: 'email',
      user_id: user.id,
      email_domain: getEmailDomain(user.email),
      signup_source: 'direct_link', // From hidden signup page
    }, user.id)

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: { id: user.id, email: user.email, name: user.name }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Signup error:", error)

    // Handle Prisma-specific errors
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      const errorMessage = "An account with this email already exists"

      await trackAuthError('auth_signup_error', {
        error_type: 'duplicate_email',
        error_message: errorMessage,
        auth_method: 'email',
        field: 'email',
      })

      return NextResponse.json(
        { error: errorMessage, field: "email" },
        { status: 400 }
      )
    }

    // Handle bcrypt errors
    if (error instanceof Error && error.message.includes('bcrypt')) {
      const errorMessage = "Password processing failed. Please try again."

      await trackAuthError('auth_signup_error', {
        error_type: 'server_error',
        error_message: errorMessage,
        auth_method: 'email',
      })

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    // Generic error for security
    const errorMessage = "Failed to create account. Please try again."
    const errorString = error instanceof Error ? error.message : String(error)

    await trackAuthError('auth_signup_error', {
      error_type: categorizeAuthError(errorString),
      error_message: errorMessage,
      auth_method: 'email',
    })

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}