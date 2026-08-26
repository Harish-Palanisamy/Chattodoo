import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
} from 'react-router-dom'

import {
  ArrowRight,
  Clock,
  Loader2,
  MessageCircle,
  Radio,
  RefreshCw,
  Search,
  Trophy,
  X,
} from 'lucide-react'

import {
  FOOTBALL_LEAGUES,
  getFootballMatches,
  isFinishedMatch,
  isLiveMatch,
  isUpcomingMatch,
  searchTeamMatches,
  type SportMatch,
} from '../lib/sportsApi'

/* =========================================================
   TIME
========================================================= */

function formatMatchTime(
  time: string,
) {
  const date =
    new Date(time)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return time
  }

  return date.toLocaleString(
    [],
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

/* =========================================================
   LOGO
========================================================= */

function TeamLogo({
  logo,
  team,
}: {
  logo?: string
  team: string
}) {
  const [
    failed,
    setFailed,
  ] =
    useState(false)

  if (
    !logo ||
    failed
  ) {
    return (
      <div className="sports-team-placeholder">
        {team
          .charAt(0)
          .toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={logo}
      alt={`${team} logo`}
      onError={() =>
        setFailed(true)
      }
      style={{
        width: 36,
        height: 36,
        objectFit: 'contain',
      }}
    />
  )
}

/* =========================================================
   SORT WITHIN LEAGUE

   1. Live
   2. Finished - newest first
   3. Upcoming - nearest first
========================================================= */

function sortLeagueMatches(
  matches: SportMatch[],
) {
  return [
    ...matches,
  ].sort(
    (a, b) => {
      const liveA =
        isLiveMatch(a)

      const liveB =
        isLiveMatch(b)

      if (
        liveA !==
        liveB
      ) {
        return liveA
          ? -1
          : 1
      }

      const finishedA =
        isFinishedMatch(a)

      const finishedB =
        isFinishedMatch(b)

      if (
        finishedA &&
        finishedB
      ) {
        return (
          new Date(
            b.time,
          ).getTime() -
          new Date(
            a.time,
          ).getTime()
        )
      }

      if (
        finishedA !==
        finishedB
      ) {
        return finishedA
          ? -1
          : 1
      }

      return (
        new Date(
          a.time,
        ).getTime() -
        new Date(
          b.time,
        ).getTime()
      )
    },
  )
}

/* =========================================================
   MATCH CARD
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
      className="sports-match-card"
      style={
        live
          ? {
              border:
                '1px solid rgba(168,85,247,.75)',

              boxShadow:
                '0 0 28px rgba(168,85,247,.14)',
            }
          : undefined
      }
    >
      <div className="sports-match-top">
        <span className="sports-competition">
          {match.competition}
        </span>

        {live ? (
          <span className="sports-live-badge">
            <span className="mini-live-dot" />

            LIVE
          </span>
        ) : upcoming ? (
          <span className="sports-match-status">
            UPCOMING
          </span>
        ) : (
          <span className="sports-match-status">
            {match.statusText ||
              'FULL TIME'}
          </span>
        )}
      </div>

      <div
        className="sports-teams"
        style={{
          display: 'grid',
          gap: 14,
          marginTop: 20,
        }}
      >
        {/* HOME TEAM */}

        <div
          className="sports-team"
          style={{
            display: 'grid',

            gridTemplateColumns:
              '40px minmax(0,1fr) auto',

            alignItems: 'center',
            gap: 11,
          }}
        >
          <TeamLogo
            logo={
              match.homeLogo
            }
            team={
              match.home
            }
          />

          <strong>
            {match.home}
          </strong>

          <span className="sports-score">
            {upcoming
              ? '—'
              : match.homeScore ??
                '—'}
          </span>
        </div>

        {/* AWAY TEAM */}

        <div
          className="sports-team"
          style={{
            display: 'grid',

            gridTemplateColumns:
              '40px minmax(0,1fr) auto',

            alignItems: 'center',
            gap: 11,
          }}
        >
          <TeamLogo
            logo={
              match.awayLogo
            }
            team={
              match.away
            }
          />

          <strong>
            {match.away}
          </strong>

          <span className="sports-score">
            {upcoming
              ? '—'
              : match.awayScore ??
                '—'}
          </span>
        </div>
      </div>

      <div className="sports-match-bottom">
        <span>
          {live ? (
            <>
              <Radio
                size={14}
              />

              {match.statusText ||
                'Live'}
            </>
          ) : (
            <>
              <Clock
                size={14}
              />

              {formatMatchTime(
                match.time,
              )}
            </>
          )}
        </span>

        <span className="sports-room-link">
          Match rooms

          <ArrowRight
            size={15}
          />
        </span>
      </div>
    </Link>
  )
}

/* =========================================================
   PAGE
========================================================= */

function SportsPage() {
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
    refreshing,
    setRefreshing,
  ] =
    useState(false)

  const [
    search,
    setSearch,
  ] =
    useState('')

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<
      SportMatch[] | null
    >(null)

  const [
    searching,
    setSearching,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  /* =======================================================
     LOAD MATCHES
  ======================================================= */

  async function loadMatches(
    refresh = false,
  ) {
    try {
      setError('')

      if (refresh) {
        setRefreshing(
          true,
        )
      } else {
        setLoading(
          true,
        )
      }

      const data =
        await getFootballMatches()

      setMatches(
        data,
      )
    } catch (
      loadError
    ) {
      console.error(
        loadError,
      )

      setError(
        loadError instanceof
          Error
          ? loadError.message
          : 'Unable to load football.',
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadMatches()

    const interval =
      window.setInterval(
        () =>
          loadMatches(
            true,
          ),
        60_000,
      )

    return () =>
      window.clearInterval(
        interval,
      )
  }, [])

  /* =======================================================
     SEARCH
  ======================================================= */

  async function handleSearch(
    value: string,
  ) {
    setSearch(
      value,
    )

    if (
      !value.trim()
    ) {
      setSearchResults(
        null,
      )

      return
    }

    try {
      setSearching(
        true,
      )

      const data =
        await searchTeamMatches(
          value,
        )

      setSearchResults(
        data,
      )
    } catch (
      searchError
    ) {
      console.error(
        'Search failed:',
        searchError,
      )

      setSearchResults([])
    } finally {
      setSearching(
        false,
      )
    }
  }

  function clearSearch() {
    setSearch('')
    setSearchResults(null)
  }

  const displayed =
    searchResults ??
    matches

  /* =======================================================
     GROUP BY LEAGUE
  ======================================================= */

  const grouped =
    useMemo(
      () =>
        FOOTBALL_LEAGUES.map(
          (league) => ({
            league,

            matches:
              sortLeagueMatches(
                displayed.filter(
                  (match) =>
                    match.leagueId ===
                    league.id,
                ),
              ),
          }),
        ),
      [displayed],
    )

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="sports-page">
      {/* ===================================================
          NAVBAR
      =================================================== */}

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

          <Link
            className="active"
            to="/sports"
          >
            Football
          </Link>

          {/* NEW FEEDBACK LINK */}

          <Link to="/feedback">
            Feedback
          </Link>
        </div>

        <div className="sports-nav-actions">
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
        </div>
      </nav>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <main className="sports-content">
        {/* HERO */}

        <section className="sports-intro">
          <span className="sports-eyebrow">
            CHATTODOO FOOTBALL
          </span>

          <h1>
            Pick the league.
            <br />

            <span>
              Follow the action.
            </span>
          </h1>

          <p>
            Matches are grouped by
            competition, with live
            games highlighted and
            league rooms always open.
          </p>

          {/* SEARCH */}

          <div className="sports-search">
            <Search
              size={20}
            />

            <input
              value={
                search
              }
              onChange={(
                event,
              ) =>
                handleSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Search a team or match..."
            />

            {search && (
              <button
                type="button"
                onClick={
                  clearSearch
                }
                aria-label="Clear search"
              >
                <X
                  size={18}
                />
              </button>
            )}
          </div>

          {search && (
            <div className="sports-search-result">
              {searching
                ? 'Searching...'
                : `${displayed.length} matches found`}
            </div>
          )}
        </section>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="sports-state">
            <Loader2
              size={28}
              className="refresh-spin"
            />

            <p>
              Loading football...
            </p>
          </div>
        ) : error ? (
          /* ===============================================
             ERROR
          =============================================== */

          <div className="sports-state error">
            <p>
              {error}
            </p>

            <button
              type="button"
              className="sports-refresh"
              onClick={() =>
                loadMatches()
              }
            >
              <RefreshCw
                size={15}
              />

              Try again
            </button>
          </div>
        ) : (
          <>
            {/* =============================================
                REFRESH
            ============================================= */}

            <div
              style={{
                display: 'flex',

                justifyContent:
                  'flex-end',

                marginBottom: 26,
              }}
            >
              <button
                type="button"
                className="sports-refresh"
                onClick={() =>
                  loadMatches(
                    true,
                  )
                }
                disabled={
                  refreshing
                }
              >
                <RefreshCw
                  size={15}
                  className={
                    refreshing
                      ? 'refresh-spin'
                      : ''
                  }
                />

                {refreshing
                  ? 'Refreshing...'
                  : 'Refresh scores'}
              </button>
            </div>

            {/* =============================================
                LEAGUES
            ============================================= */}

            {grouped.map(
              ({
                league,
                matches:
                  leagueMatches,
              }) => (
                <section
                  key={
                    league.id
                  }
                  className="sports-match-section"
                >
                  {/* LEAGUE HEADER */}

                  <div className="sports-section-header">
                    <div>
                      <span className="sports-section-label">
                        {
                          league.icon
                        }{' '}

                        {
                          league.country
                        }
                      </span>

                      <h2>
                        {
                          league.name
                        }
                      </h2>
                    </div>

                    <Link
                      to={`/league/${league.id}`}
                      className="sports-room-link"
                    >
                      <MessageCircle
                        size={15}
                      />

                      Table & open chat

                      <ArrowRight
                        size={15}
                      />
                    </Link>
                  </div>

                  {/* LEAGUE MATCHES */}

                  {leagueMatches.length >
                  0 ? (
                    <div className="sports-match-grid">
                      {leagueMatches.map(
                        (match) => (
                          <MatchCard
                            key={
                              `${league.id}-${match.id}`
                            }
                            match={
                              match
                            }
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    /* =====================================
                       EMPTY LEAGUE
                    ===================================== */

                    <div className="sports-empty">
                      <Trophy
                        size={27}
                      />

                      <div>
                        <strong>
                          No matches in the
                          current window
                        </strong>

                        <p>
                          Open the league
                          page for the full
                          2026/27 schedule.
                        </p>

                        <Link
                          to={`/league/${league.id}`}
                          className="sports-room-link"
                        >
                          View{' '}
                          {
                            league.name
                          }

                          <ArrowRight
                            size={14}
                          />
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              ),
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default SportsPage