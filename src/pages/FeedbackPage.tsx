import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  ArrowLeft,
  Bug,
  CheckCircle2,
  Database,
  Lightbulb,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react'

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

import {
  auth,
} from '../lib/firebase'

import {
  submitFeedback,
  type FeedbackCategory,
} from '../lib/feedbackApi'

type Category = {
  id: FeedbackCategory
  title: string
  description: string
  icon: typeof Bug
}

const categories: Category[] = [
  {
    id: 'bug',
    title: 'Bug',
    description:
      'Something is not working correctly.',
    icon: Bug,
  },

  {
    id: 'feature',
    title: 'Feature',
    description:
      'Something you want Chattodoo to add.',
    icon: Lightbulb,
  },

  {
    id: 'sports-data',
    title: 'Sports Data',
    description:
      'Wrong score, fixture, table or team data.',
    icon: Database,
  },

  {
    id: 'general',
    title: 'General',
    description:
      'Anything else you want to tell us.',
    icon: MessageSquare,
  },
]

function FeedbackPage() {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      auth.currentUser,
    )

  const [
    category,
    setCategory,
  ] =
    useState<FeedbackCategory>(
      'general',
    )

  const [
    message,
    setMessage,
  ] =
    useState('')

  const [
    sending,
    setSending,
  ] =
    useState(false)

  const [
    submitted,
    setSubmitted,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      setUser,
    )
  }, [])

  async function handleSubmit() {
    if (sending) {
      return
    }

    try {
      setSending(true)
      setError('')

      await submitFeedback({
        category,

        message,

        userId:
          user?.uid,

        userEmail:
          user?.email ??
          undefined,
      })

      setMessage('')
      setSubmitted(true)
    } catch (submitError) {
      console.error(
        'Feedback submission failed:',
        submitError,
      )

      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not submit feedback.',
      )
    } finally {
      setSending(false)
    }
  }

  function submitAnother() {
    setSubmitted(false)
    setCategory('general')
    setMessage('')
    setError('')
  }

  return (
    <div
      className="sports-page"
      style={{
        minHeight: '100vh',
      }}
    >
      {/* NAVBAR */}

      <nav className="sports-navbar">
        <Link
          className="sports-brand"
          to="/"
        >
          <div className="sports-brand-mark">
            C
          </div>

          <span>
            chattodoo
          </span>
        </Link>

        <div className="sports-nav-links">
          <Link to="/">
            Home
          </Link>

          <Link to="/sports">
            Football
          </Link>

          <Link
            className="active"
            to="/feedback"
          >
            Feedback
          </Link>
        </div>

        <div className="sports-nav-actions">
          {!user && (
            <>
              <Link
                to="/login"
                className="sports-login"
              >
                Log in
              </Link>

              <Link
                to="/signup"
                className="sports-signup"
              >
                Join Chattodoo
              </Link>
            </>
          )}
        </div>
      </nav>

      <main
        className="sports-content"
        style={{
          maxWidth: 950,
        }}
      >
        <Link
          to="/sports"
          className="community-back"
        >
          <ArrowLeft
            size={15}
          />

          Back to Football
        </Link>

        {/* HEADER */}

        <section
          style={{
            padding:
              '55px 0 35px',
          }}
        >
          <span className="sports-eyebrow">
            CHATTODOO FEEDBACK
          </span>

          <h1
            style={{
              fontSize:
                'clamp(3rem, 7vw, 5.8rem)',

              lineHeight: 0.95,

              margin:
                '12px 0 20px',
            }}
          >
            Help us make
            <br />

            <span
              style={{
                color:
                  '#a855f7',
              }}
            >
              Chattodoo better.
            </span>
          </h1>

          <p
            style={{
              maxWidth: 600,
              opacity: 0.67,
              lineHeight: 1.7,
            }}
          >
            Found something broken?
            Have an idea? Tell us
            what should change.
          </p>
        </section>

        {submitted ? (
          /* SUCCESS */

          <section
            className="room-panel"
            style={{
              textAlign: 'center',
              padding: '70px 30px',
            }}
          >
            <CheckCircle2
              size={48}
              style={{
                marginBottom: 20,
              }}
            />

            <h2>
              Feedback received.
            </h2>

            <p
              style={{
                opacity: 0.65,
                margin:
                  '10px auto 25px',

                maxWidth: 430,
              }}
            >
              Thanks for helping us
              improve Chattodoo.
            </p>

            <button
              type="button"
              className="send-button"
              onClick={
                submitAnother
              }
            >
              Send another
            </button>
          </section>
        ) : (
          <>
            {/* CATEGORIES */}

            <section>
              <span className="sports-section-label">
                WHAT'S THIS ABOUT?
              </span>

              <div
                style={{
                  display: 'grid',

                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(180px, 1fr))',

                  gap: 12,

                  marginTop: 16,
                }}
              >
                {categories.map(
                  (item) => {
                    const Icon =
                      item.icon

                    const active =
                      category ===
                      item.id

                    return (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={() =>
                          setCategory(
                            item.id,
                          )
                        }
                        style={{
                          textAlign:
                            'left',

                          padding: 20,

                          borderRadius:
                            14,

                          border: active
                            ? '1px solid #a855f7'
                            : '1px solid rgba(255,255,255,.1)',

                          background:
                            active
                              ? 'rgba(168,85,247,.12)'
                              : 'rgba(255,255,255,.025)',

                          color:
                            'inherit',

                          cursor:
                            'pointer',

                          transition:
                            '150ms ease',
                        }}
                      >
                        <Icon
                          size={21}
                        />

                        <strong
                          style={{
                            display:
                              'block',

                            marginTop:
                              14,
                          }}
                        >
                          {
                            item.title
                          }
                        </strong>

                        <span
                          style={{
                            display:
                              'block',

                            marginTop:
                              7,

                            opacity:
                              0.55,

                            fontSize:
                              12,

                            lineHeight:
                              1.5,
                          }}
                        >
                          {
                            item.description
                          }
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            </section>

            {/* MESSAGE */}

            <section
              className="room-panel"
              style={{
                marginTop: 24,
                padding: 25,
              }}
            >
              <div
                style={{
                  display: 'flex',

                  justifyContent:
                    'space-between',

                  alignItems:
                    'center',

                  marginBottom: 13,
                }}
              >
                <strong>
                  Tell us more
                </strong>

                <span
                  style={{
                    opacity: 0.45,
                    fontSize: 12,
                  }}
                >
                  {message.length}/2000
                </span>
              </div>

              <textarea
                value={
                  message
                }
                maxLength={2000}
                onChange={(
                  event,
                ) =>
                  setMessage(
                    event.target
                      .value,
                  )
                }
                placeholder="What happened? What would you like us to improve?"
                style={{
                  width: '100%',
                  minHeight: 180,

                  resize:
                    'vertical',

                  boxSizing:
                    'border-box',

                  padding: 17,

                  borderRadius: 12,

                  border:
                    '1px solid rgba(255,255,255,.1)',

                  background:
                    'rgba(0,0,0,.25)',

                  color: 'inherit',

                  font:
                    'inherit',

                  lineHeight: 1.6,

                  outline: 'none',
                }}
              />

              {error && (
                <p
                  style={{
                    marginTop: 12,
                    color:
                      '#f87171',
                  }}
                >
                  {error}
                </p>
              )}

              {!user && (
                <p
                  style={{
                    opacity: 0.5,
                    fontSize: 12,
                    marginTop: 12,
                  }}
                >
                  You're submitting
                  as a guest.
                </p>
              )}

              <div
                style={{
                  display: 'flex',

                  justifyContent:
                    'flex-end',

                  marginTop: 18,
                }}
              >
                <button
                  type="button"
                  className="send-button"
                  disabled={
                    sending ||
                    message.trim()
                      .length < 5
                  }
                  onClick={
                    handleSubmit
                  }
                >
                  {sending ? (
                    <>
                      <Loader2
                        size={15}
                        className="refresh-spin"
                      />

                      Sending...
                    </>
                  ) : (
                    <>
                      <Send
                        size={15}
                      />

                      Send feedback
                    </>
                  )}
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default FeedbackPage