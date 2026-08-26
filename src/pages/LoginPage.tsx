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
  login,
} from '../lib/auth'

import './AuthPage.css'

export default function LoginPage() {
  const navigate =
    useNavigate()

  const [
    email,
    setEmail,
  ] = useState('')

  const [
    password,
    setPassword,
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

    if (!email.trim()) {
      setError(
        'Enter your email.',
      )
      return
    }

    if (!password) {
      setError(
        'Enter your password.',
      )
      return
    }

    try {
      setLoading(true)
      setError('')

      await login(
        email.trim(),
        password,
      )

      navigate('/movies')
    } catch (loginError) {
      console.error(
        'Login failed:',
        loginError,
      )

      const code =
        (
          loginError as {
            code?: string
          }
        ).code

      if (
        code ===
        'auth/invalid-credential'
      ) {
        setError(
          'Email or password is incorrect.',
        )
      } else if (
        code ===
        'auth/user-not-found'
      ) {
        setError(
          'No account exists with this email.',
        )
      } else if (
        code ===
        'auth/wrong-password'
      ) {
        setError(
          'Email or password is incorrect.',
        )
      } else {
        setError(
          'Could not log you in. Please try again.',
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
            WELCOME BACK
          </span>

          <h1>
            Good to
            <br />
            see you.
          </h1>

          <p>
            Get back into the
            conversation.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={
            handleSubmit
          }
        >

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
              placeholder="Your password"
              autoComplete="current-password"
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
              ? 'Logging in...'
              : 'Log in →'}
          </button>

        </form>

        <p className="auth-switch">
          Don't have an account?{' '}

          <Link to="/signup">
            Create one
          </Link>
        </p>

      </div>
    </main>
  )
}