import {
  useState,
} from 'react'

import type {
  FormEvent,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  signUp,
} from '../lib/auth'

import './AuthPage.css'

export default function SignupPage() {
  const navigate =
    useNavigate()

  const [
    username,
    setUsername,
  ] = useState('')

  const [
    email,
    setEmail,
  ] = useState('')

  const [
    password,
    setPassword,
  ] = useState('')

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    const cleanUsername =
      username.trim()

    const cleanEmail =
      email.trim()

    if (!cleanUsername) {
      setError(
        'Enter a username.',
      )
      return
    }

    if (!cleanEmail) {
      setError(
        'Enter your email.',
      )
      return
    }

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters.',
      )
      return
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Passwords do not match.',
      )
      return
    }

    try {
      setLoading(true)
      setError('')

      await signUp(
        cleanUsername,
        cleanEmail,
        password,
      )

      navigate('/movies')
    } catch (signupError) {
      console.error(
        'Signup failed:',
        signupError,
      )

      const code =
        (
          signupError as {
            code?: string
          }
        ).code

      if (
        code ===
        'auth/email-already-in-use'
      ) {
        setError(
          'An account with this email already exists.',
        )
      } else if (
        code ===
        'auth/invalid-email'
      ) {
        setError(
          'Please enter a valid email.',
        )
      } else {
        setError(
          'Could not create your account. Please try again.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">

        <Link
          to="/"
          className="auth-logo"
        >
          CHATTODOO<span>.</span>
        </Link>

        <div className="auth-heading">
          <span>
            JOIN CHATTODOO
          </span>

          <h1>
            Create your
            <br />
            account.
          </h1>

          <p>
            Make movie nights,
            sports chats and
            watch parties yours.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={
            handleSubmit
          }
        >

          <label>
            Username

            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value,
                )
              }
              placeholder="Your username"
              maxLength={30}
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="At least 6 characters"
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          <label>
            Confirm password

            <input
              type="password"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Enter password again"
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Creating account...'
              : 'Create account →'}
          </button>

        </form>

        <p className="auth-switch">
          Already have an account?{' '}

          <Link to="/login">
            Log in
          </Link>
        </p>

      </div>
    </main>
  )
}