import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  MessageCircle,
  Radio,
  Send,
  Trophy,
  Users,
} from 'lucide-react'

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

import {
  auth,
} from '../lib/firebase'

import {
  getLeague,
  getLeagueStandings,
  type LeagueStanding,
} from '../lib/leagueApi'

import {
  getLeagueSeasonMatches,
  isFinishedMatch,
  isLiveMatch,
  isUpcomingMatch,
  type SportMatch,
} from '../lib/sportsApi'

import {
  addReaction,
  joinRoom,
  leaveRoom,
  sendRoomMessage,
  subscribeToMessages,
  subscribeToReactions,
  subscribeToViewerCount,
  type RoomMessage,
  type RoomReactions,
} from '../lib/sportsRoomApi'

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
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    },
  )
}

/* =========================================================
   TEAM LOGO
========================================================= */

function TeamLogo({
  logo,
  team,
  size = 32,
}: {
  logo?: string
  team: string
  size?: number
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
      <div
        style={{
          width: size,
          height: size,
          minWidth: size,

          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'center',

          borderRadius: 8,

          background:
            'rgba(139,92,246,.14)',

          fontSize: 12,
          fontWeight: 800,
        }}
      >
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
        width: size,
        height: size,
        minWidth: size,

        objectFit:
          'contain',
      }}
    />
  )
}

/* =========================================================
   SEASON MATCH CARD
========================================================= */

function SeasonMatchCard({
  match,
}: {
  match: SportMatch
}) {
  const live =
    isLiveMatch(match)

  const upcoming =
    isUpcomingMatch(match)

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
                '1px solid rgba(168,85,247,.8)',

              boxShadow:
                '0 0 26px rgba(168,85,247,.14)',
            }
          : undefined
      }
    >
      <div className="sports-match-top">
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

        <span className="sports-competition">
          {formatTime(
            match.time,
          )}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 13,
          marginTop: 17,
        }}
      >
        <div
          style={{
            display: 'grid',

            gridTemplateColumns:
              '36px minmax(0,1fr) auto',

            alignItems:
              'center',

            gap: 10,
          }}
        >
          <TeamLogo
            logo={
              match.homeLogo
            }
            team={
              match.home
            }
            size={34}
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

        <div
          style={{
            display: 'grid',

            gridTemplateColumns:
              '36px minmax(0,1fr) auto',

            alignItems:
              'center',

            gap: 10,
          }}
        >
          <TeamLogo
            logo={
              match.awayLogo
            }
            team={
              match.away
            }
            size={34}
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

              {formatTime(
                match.time,
              )}
            </>
          )}
        </span>

        <span className="sports-room-link">
          Match room

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

function LeaguePage() {
  const {
    leagueId,
  } =
    useParams<{
      leagueId: string
    }>()

  const league =
    useMemo(
      () =>
        leagueId
          ? getLeague(
              leagueId,
            )
          : undefined,
      [leagueId],
    )

  const [
    standings,
    setStandings,
  ] =
    useState<
      LeagueStanding[]
    >([])

  const [
    seasonMatches,
    setSeasonMatches,
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

  const [
    user,
    setUser,
  ] =
    useState<
      User | null
    >(
      auth.currentUser,
    )

  const [
    messages,
    setMessages,
  ] =
    useState<
      RoomMessage[]
    >([])

  const [
    viewers,
    setViewers,
  ] =
    useState(0)

  const [
    reactions,
    setReactions,
  ] =
    useState<
      RoomReactions
    >({
      heart: 0,
      fire: 0,
      laugh: 0,
      wow: 0,
    })

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

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      setUser,
    )
  }, [])

  /* =======================================================
     LOAD LEAGUE
  ======================================================= */

  useEffect(() => {
    if (!leagueId) {
      return
    }

    let cancelled =
      false

    async function load() {
      try {
        setLoading(true)
        setError('')

        const [
          table,
          matches,
        ] =
          await Promise.all([
            getLeagueStandings(
              leagueId!,
            ),

            getLeagueSeasonMatches(
              leagueId!,
            ),
          ])

        if (
          !cancelled
        ) {
          setStandings(
            table,
          )

          setSeasonMatches(
            matches,
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
              : 'League data unavailable.',
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled =
        true
    }
  }, [
    leagueId,
  ])

  const roomId =
    league
      ? `league-${league.id}`
      : ''

  /* =======================================================
     CHAT
  ======================================================= */

  useEffect(() => {
    if (!roomId) {
      return
    }

    const messagesSub =
      subscribeToMessages(
        roomId,
        setMessages,
      )

    const reactionsSub =
      subscribeToReactions(
        roomId,
        setReactions,
      )

    const viewerSub =
      subscribeToViewerCount(
        roomId,
        setViewers,
      )

    joinRoom(
      roomId,
    ).catch(
      console.error,
    )

    return () => {
      messagesSub()
      reactionsSub()
      viewerSub()

      leaveRoom(
        roomId,
      ).catch(
        console.error,
      )
    }
  }, [
    roomId,
  ])

  async function sendMessage() {
    if (
      !roomId ||
      !message.trim() ||
      sending
    ) {
      return
    }

    try {
      setSending(true)

      await sendRoomMessage(
        roomId,

        user?.displayName ??
          user?.email ??
          'Guest',

        message,

        user?.uid,
      )

      setMessage('')
    } finally {
      setSending(false)
    }
  }

  /* =======================================================
     MATCH SECTIONS
  ======================================================= */

  const liveMatches =
    useMemo(
      () =>
        seasonMatches.filter(
          isLiveMatch,
        ),
      [seasonMatches],
    )

  const finishedMatches =
    useMemo(
      () =>
        seasonMatches
          .filter(
            isFinishedMatch,
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
      [seasonMatches],
    )

  const upcomingMatches =
    useMemo(
      () =>
        seasonMatches
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
      [seasonMatches],
    )

  if (!league) {
    return (
      <div className="community-page">
        <div className="community-not-found">
          <h1>
            League unavailable
          </h1>

          <Link to="/sports">
            Back to Football
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="community-page">
      {/* NAV */}

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

        <Link
          className="back-sports"
          to="/sports"
        >
          <ArrowLeft
            size={15}
          />

          Football
        </Link>
      </nav>

      <main className="community-content">
        {/* HEADER */}

        <section
          style={{
            padding:
              '46px 0 30px',
          }}
        >
          <span className="sports-eyebrow">
            {league.country}
          </span>

          <h1
            style={{
              margin:
                '10px 0',

              fontSize:
                'clamp(2.8rem,6vw,5.2rem)',
            }}
          >
            {league.icon}{' '}
            {league.name}
          </h1>

          <p
            style={{
              opacity: 0.68,
            }}
          >
            Table, fixtures and
            open league discussion.
          </p>
        </section>

        {loading ? (
          <div className="sports-state">
            <Loader2
              className="refresh-spin"
              size={28}
            />

            Loading league...
          </div>
        ) : error ? (
          <div className="sports-state error">
            {error}
          </div>
        ) : (
          <>
            {/* TABLE */}

            <section className="room-panel">
              <div className="panel-heading">
                <span>
                  <Trophy
                    size={15}
                  />

                  LEAGUE TABLE
                </span>

                <small>
                  2026/27
                </small>
              </div>

              <div
                style={{
                  overflowX:
                    'auto',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse:
                      'collapse',

                    minWidth: 700,
                  }}
                >
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Club</th>
                      <th>P</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>GD</th>
                      <th>PTS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {standings.map(
                      (
                        entry,
                        index,
                      ) => (
                        <tr
                          key={
                            entry.teamId
                          }
                        >
                          <td>
                            {entry.position ||
                              index +
                                1}
                          </td>

                          <td>
                            <div
                              style={{
                                display:
                                  'flex',

                                alignItems:
                                  'center',

                                gap: 10,
                              }}
                            >
                              <TeamLogo
                                logo={
                                  entry.logo
                                }
                                team={
                                  entry.team
                                }
                              />

                              <strong>
                                {
                                  entry.team
                                }
                              </strong>
                            </div>
                          </td>

                          <td>
                            {
                              entry.played
                            }
                          </td>

                          <td>
                            {
                              entry.wins
                            }
                          </td>

                          <td>
                            {
                              entry.draws
                            }
                          </td>

                          <td>
                            {
                              entry.losses
                            }
                          </td>

                          <td>
                            {entry.goalDifference >
                            0
                              ? '+'
                              : ''}

                            {
                              entry.goalDifference
                            }
                          </td>

                          <td>
                            <strong>
                              {
                                entry.points
                              }
                            </strong>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* OPEN CHAT */}

            <section
              className="live-room"
              style={{
                marginTop: 30,
              }}
            >
              <div className="live-room-header">
                <div>
                  <span className="live-badge">
                    ● OPEN LEAGUE ROOM
                  </span>

                  <h2>
                    {league.name}{' '}
                    Chat
                  </h2>
                </div>

                <div className="live-viewers">
                  <Users
                    size={17}
                  />

                  <strong>
                    {viewers}
                  </strong>

                  <small>
                    online
                  </small>
                </div>
              </div>

              <div className="chat-area">
                <div className="chat-title">
                  <MessageCircle
                    size={15}
                  />

                  League conversation
                </div>

                <div className="chat-messages">
                  {messages.length ===
                  0 ? (
                    <div className="chat-empty">
                      <h3>
                        No messages yet
                      </h3>

                      <p>
                        Start the league
                        conversation.
                      </p>
                    </div>
                  ) : (
                    messages.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="chat-message"
                        >
                          <span className="chat-avatar">
                            {item.name
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </span>

                          <div>
                            <strong>
                              {
                                item.name
                              }
                            </strong>

                            <p>
                              {
                                item.text
                              }
                            </p>
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>

                <div className="chat-input-area">
                  <input
                    value={
                      message
                    }
                    onChange={(
                      event,
                    ) =>
                      setMessage(
                        event.target
                          .value,
                      )
                    }
                    onKeyDown={(
                      event,
                    ) => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        sendMessage()
                      }
                    }}
                    placeholder="Talk about the league..."
                  />

                  <button
                    className="send-button"
                    type="button"
                    onClick={
                      sendMessage
                    }
                  >
                    <Send
                      size={15}
                    />

                    Send
                  </button>
                </div>

                <div className="room-reactions">
                  <button
                    type="button"
                    onClick={() =>
                      addReaction(
                        roomId,
                        'heart',
                      )
                    }
                  >
                    ❤️{' '}
                    {
                      reactions.heart
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      addReaction(
                        roomId,
                        'fire',
                      )
                    }
                  >
                    🔥{' '}
                    {
                      reactions.fire
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      addReaction(
                        roomId,
                        'laugh',
                      )
                    }
                  >
                    😂{' '}
                    {
                      reactions.laugh
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      addReaction(
                        roomId,
                        'wow',
                      )
                    }
                  >
                    ⚡{' '}
                    {
                      reactions.wow
                    }
                  </button>
                </div>
              </div>
            </section>

            {/* LIVE */}

            {liveMatches.length >
              0 && (
              <section className="sports-match-section">
                <div className="sports-section-header">
                  <div>
                    <span className="sports-section-label">
                      <span className="live-dot" />

                      LIVE
                    </span>

                    <h2>
                      Happening now
                    </h2>
                  </div>
                </div>

                <div className="sports-match-grid">
                  {liveMatches.map(
                    (match) => (
                      <SeasonMatchCard
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
              </section>
            )}

            {/* UPCOMING */}

            <section className="sports-match-section">
              <div className="sports-section-header">
                <div>
                  <span className="sports-section-label">
                    UPCOMING
                  </span>

                  <h2>
                    Fixtures
                  </h2>
                </div>
              </div>

              <div className="sports-match-grid">
                {upcomingMatches.map(
                  (match) => (
                    <SeasonMatchCard
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
            </section>

            {/* FINISHED */}

            <section className="sports-match-section">
              <div className="sports-section-header">
                <div>
                  <span className="sports-section-label">
                    RESULTS
                  </span>

                  <h2>
                    Finished matches
                  </h2>
                </div>
              </div>

              <div className="sports-match-grid">
                {finishedMatches.map(
                  (match) => (
                    <SeasonMatchCard
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
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default LeaguePage