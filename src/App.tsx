import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ArrowRight,
  CalendarDays,
  Clock,
  MessageCircle,
  Radio,
  Trophy,
} from 'lucide-react'

import {
  Link,
} from 'react-router-dom'

import './App.css'

import {
  getFootballMatches,
  isLiveMatch,
  isRecentMatch,
  isUpcomingMatch,
  type SportMatch,
} from './lib/sportsApi'

/* =========================================================
   TIME
========================================================= */

function formatTime(
  value: string,
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString(
    [],
    {
      weekday:
        'short',

      day:
        'numeric',

      month:
        'short',

      hour:
        '2-digit',

      minute:
        '2-digit',
    },
  )
}

/* =========================================================
   LOGO
========================================================= */

function TeamLogo({
  src,
  name,
}: {
  src?: string
  name: string
}) {
  const [
    failed,
    setFailed,
  ] =
    useState(false)

  if (
    !src ||
    failed
  ) {
    return (
      <div
        style={{
          width: 42,
          height: 42,

          minWidth: 42,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          borderRadius:
            12,

          background:
            'rgba(139,92,246,.12)',

          border:
            '1px solid rgba(168,85,247,.25)',

          fontWeight:
            800,
        }}
      >
        {name
          .charAt(0)
          .toUpperCase()}
      </div>
    )
  }

  return (
    <div
      style={{
        width: 42,
        height: 42,

        minWidth: 42,

        display:
          'flex',

        alignItems:
          'center',

        justifyContent:
          'center',

        overflow:
          'hidden',
      }}
    >
      <img
        src={src}
        alt={`${name} logo`}
        onError={() =>
          setFailed(
            true,
          )
        }
        style={{
          width: 36,
          height: 36,

          maxWidth: 36,
          maxHeight: 36,

          objectFit:
            'contain',
        }}
      />
    </div>
  )
}

/* =========================================================
   CARD
========================================================= */

function MatchCard({
  match,
}: {
  match: SportMatch
}) {
  const live =
    isLiveMatch(
      match,
    )

  const upcoming =
    isUpcomingMatch(
      match,
    )

  return (
    <Link
      to={`/match/football/${encodeURIComponent(
        match.id,
      )}`}
      className="match-card"
      style={{
        minHeight:
          270,

        padding:
          22,

        overflow:
          'hidden',
      }}
    >
      <div className="match-card-top">
        <div>
          <span className="match-sport">
            ⚽ FOOTBALL
          </span>

          <span className="match-league">
            {
              match.competition
            }
          </span>
        </div>

        {live ? (
          <span className="match-live">
            <span />
            LIVE
          </span>
        ) : upcoming ? (
          <span className="match-status">
            UPCOMING
          </span>
        ) : (
          <span className="match-status">
            {match.statusText}
          </span>
        )}
      </div>

      <div
        style={{
          display:
            'grid',

          gap:
            15,

          marginTop:
            24,
        }}
      >
        {/* HOME */}

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              '42px minmax(0,1fr) auto',

            alignItems:
              'center',

            gap:
              12,

            paddingBottom:
              14,

            borderBottom:
              '1px solid rgba(255,255,255,.07)',
          }}
        >
          <TeamLogo
            src={
              match.homeLogo
            }
            name={
              match.home
            }
          />

          <span>
            {
              match.home
            }
          </span>

          <strong>
            {upcoming
              ? '—'
              : match.homeScore ??
                '—'}
          </strong>
        </div>

        {/* AWAY */}

        <div
          style={{
            display:
              'grid',

            gridTemplateColumns:
              '42px minmax(0,1fr) auto',

            alignItems:
              'center',

            gap:
              12,
          }}
        >
          <TeamLogo
            src={
              match.awayLogo
            }
            name={
              match.away
            }
          />

          <span>
            {
              match.away
            }
          </span>

          <strong>
            {upcoming
              ? '—'
              : match.awayScore ??
                '—'}
          </strong>
        </div>
      </div>

      <div className="match-footer">
        <span>
          {live ? (
            <>
              <Radio
                size={14}
              />

              {match.statusText}
            </>
          ) : (
            <>
              <Clock
                size={14}
              />

              {formatTime(
                match.time,
              )}
            </>
          )}
        </span>

        <span className="enter-room">
          Match rooms

          <ArrowRight
            size={14}
          />
        </span>
      </div>
    </Link>
  )
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [
    matches,
    setMatches,
  ] =
    useState<
      SportMatch[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState('')

  useEffect(() => {
    let cancelled =
      false

    async function load() {
      try {
        setError('')

        const data =
          await getFootballMatches()

        if (
          !cancelled
        ) {
          setMatches(
            data,
          )
        }
      } catch (
        loadError
      ) {
        console.error(
          loadError,
        )

        if (
          !cancelled
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Football unavailable.',
          )

          setMatches(
            [],
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false,
          )
        }
      }
    }

    load()

    const interval =
      window.setInterval(
        load,
        60_000,
      )

    return () => {
      cancelled =
        true

      window.clearInterval(
        interval,
      )
    }
  }, [])

  /* LIVE */

  const live =
    useMemo(
      () =>
        matches
          .filter(
            isLiveMatch,
          )
          .sort(
            (a, b) =>
              new Date(
                a.time,
              ).getTime() -
              new Date(
                b.time,
              ).getTime(),
          ),
      [matches],
    )

  /* UPCOMING */

  const upcoming =
    useMemo(
      () =>
        matches
          .filter(
            isUpcomingMatch,
          )
          .sort(
            (a, b) =>
              new Date(
                a.time,
              ).getTime() -
              new Date(
                b.time,
              ).getTime(),
          ),
      [matches],
    )

  /* RECENT */

  const recent =
    useMemo(
      () =>
        matches
          .filter(
            isRecentMatch,
          )
          .sort(
            (a, b) =>
              new Date(
                b.time,
              ).getTime() -
              new Date(
                a.time,
              ).getTime(),
          ),
      [matches],
    )

  /* FEATURED */

  const featured =
    useMemo(
      () => {
        const seen =
          new Set<
            string
          >()

        return [
          ...live,
          ...upcoming,
          ...recent,
        ]
          .filter(
            (
              match,
            ) => {
              if (
                seen.has(
                  match.id,
                )
              ) {
                return false
              }

              seen.add(
                match.id,
              )

              return true
            },
          )
          .slice(
            0,
            6,
          )
      },
      [
        live,
        upcoming,
        recent,
      ],
    )

  return (
    <div className="app">
      {/* NAV */}

      <nav className="navbar">
        <Link
          to="/"
          className="brand"
        >
          <div className="brand-mark">
            C
          </div>

          <span>
            chattodoo
          </span>
        </Link>

        <div className="nav-links">
          <Link to="/">
            Home
          </Link>

          <Link to="/sports">
            Football
          </Link>
        </div>

        <div className="nav-actions">
          <Link
            to="/login"
            className="login-button"
          >
            Log in
          </Link>

          <Link
            to="/signup"
            className="signup-button"
          >
            Join Chattodoo
          </Link>
        </div>
      </nav>

      <main>
        {/* HERO */}

        <section className="hero-section">
          <div className="hero-glow glow-one" />
          <div className="hero-glow glow-two" />

          <div className="hero-content">
            <div className="live-pill">
              <span />

              FOOTBALL.
              LIVE TOGETHER.
            </div>

            <h1>
              Follow the match.
              <br />

              <span>
                Join the crowd.
              </span>
            </h1>

            <p>
              Live scores,
              upcoming fixtures
              and match rooms for
              football fans.
            </p>

            <div className="hero-buttons">
              <Link
                to="/sports"
                className="primary-button"
              >
                Explore football

                <ArrowRight
                  size={18}
                />
              </Link>

              <a
                href="#featured"
                className="secondary-button"
              >
                Featured matches
              </a>
            </div>

            <div className="hero-stats">
              <div>
                <strong>
                  {live.length}
                </strong>

                <span>
                  live now
                </span>
              </div>

              <div>
                <strong>
                  {
                    upcoming.length
                  }
                </strong>

                <span>
                  next 7 days
                </span>
              </div>

              <div>
                <strong>
                  {recent.length}
                </strong>

                <span>
                  last 2 days
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED */}

        <section
          className="live-section"
          id="featured"
        >
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="red-dot" />

                FEATURED MATCHES
              </div>

              <h2>
                Live and upcoming
                games worth
                following.
              </h2>
            </div>

            <Link
              to="/sports"
              className="view-all"
            >
              All matches

              <ArrowRight
                size={16}
              />
            </Link>
          </div>

          {loading ? (
            <div className="empty-sports">
              Loading fixtures...
            </div>
          ) : error ? (
            <div className="empty-sports">
              {error}
            </div>
          ) : featured.length >
            0 ? (
            <div className="match-grid">
              {featured.map(
                (
                  match,
                ) => (
                  <MatchCard
                    key={
                      match.id
                    }
                    match={
                      match
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <div className="empty-sports">
              No featured matches
              currently available.
            </div>
          )}
        </section>

        {/* UPCOMING */}

        <section className="live-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow purple-eyebrow">
                <CalendarDays
                  size={15}
                />

                UPCOMING
              </div>

              <h2>
                Next 7 days.
              </h2>
            </div>
          </div>

          {upcoming.length >
          0 ? (
            <div className="match-grid">
              {upcoming
                .slice(
                  0,
                  9,
                )
                .map(
                  (
                    match,
                  ) => (
                    <MatchCard
                      key={
                        match.id
                      }
                      match={
                        match
                      }
                    />
                  ),
                )}
            </div>
          ) : (
            <div className="empty-sports">
              No upcoming
              fixtures available.
            </div>
          )}
        </section>

        {/* MATCH ROOMS */}

        <section className="sports-preview">
          <div>
            <div className="eyebrow purple-eyebrow">
              <MessageCircle
                size={15}
              />

              MATCH ROOMS
            </div>

            <h2>
              Find your crowd.
            </h2>

            <p>
              Join the official
              room or create a
              community room for
              the match.
            </p>
          </div>

          <Link
            to="/sports"
            className="primary-button"
          >
            Explore matches

            <ArrowRight
              size={18}
            />
          </Link>
        </section>

        <section className="cta-section">
          <Trophy
            size={30}
          />

          <h2>
            Football happens
            together.
          </h2>

          <p>
            Follow the fixture.
            Enter the room.
            Join the conversation.
          </p>

          <Link
            to="/sports"
            className="primary-button"
          >
            Enter Chattodoo

            <ArrowRight
              size={18}
            />
          </Link>
        </section>
      </main>

      <footer>
        <div className="brand footer-brand">
          <div className="brand-mark">
            C
          </div>

          <span>
            chattodoo
          </span>
        </div>

        <span>
          Football happens
          together.
        </span>

        <span>
          © 2026 Chattodoo
        </span>
      </footer>
    </div>
  )
}

export default App