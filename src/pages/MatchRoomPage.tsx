import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

import {
  ArrowLeft,
  MessageCircle,
  Plus,
  Users,
  X,
} from 'lucide-react'

import {
  auth,
} from '../lib/firebase'

import {
  getMatch,
  getMatchDetails,
  isLiveMatch,
  type MatchEvent,
  type SportMatch,
} from '../lib/sportsApi'

import {
  createCommunityRoom,
  subscribeToCommunityRooms,
  type CommunityRoom,
} from '../lib/sportsRoomApi'

function displayLiveClock(
  match: SportMatch,
  tick: number,
) {
  if (
    !isLiveMatch(match)
  ) {
    return (
      match.statusText ||
      match.status
    )
  }

  if (
    typeof match.clockSeconds ===
      'number' &&
    Number.isFinite(
      match.clockSeconds,
    )
  ) {
    const total =
      Math.max(
        0,
        Math.floor(
          match.clockSeconds +
            tick,
        ),
      )

    const minutes =
      Math.floor(
        total / 60,
      )

    const seconds =
      total % 60

    return `${minutes}:${String(
      seconds,
    ).padStart(2, '0')}`
  }

  return (
    match.statusText ||
    'LIVE'
  )
}

function EventIcon({
  event,
}: {
  event: MatchEvent
}) {
  if (
    event.type ===
    'goal'
  ) {
    return <span>⚽</span>
  }

  if (
    event.type ===
    'red-card'
  ) {
    return <span>🟥</span>
  }

  if (
    event.type ===
    'yellow-card'
  ) {
    return <span>🟨</span>
  }

  return <span>•</span>
}

function MatchRoomPage() {
  const {
    sport,
    matchSlug,
  } = useParams<{
    sport: string
    matchSlug: string
  }>()

  const navigate =
    useNavigate()

  const [
    match,
    setMatch,
  ] =
    useState<
      SportMatch | null
    >(null)

  const [
    matchEvents,
    setMatchEvents,
  ] =
    useState<
      MatchEvent[]
    >([])

  const [
    clockTick,
    setClockTick,
  ] =
    useState(0)

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
    rooms,
    setRooms,
  ] =
    useState<
      CommunityRoom[]
    >([])

  const [
    showCreate,
    setShowCreate,
  ] =
    useState(false)

  const [
    roomName,
    setRoomName,
  ] =
    useState('')

  const [
    description,
    setDescription,
  ] =
    useState('')

  const [
    maxMembers,
    setMaxMembers,
  ] =
    useState(50)

  const [
    creating,
    setCreating,
  ] =
    useState(false)

  const [
    createError,
    setCreateError,
  ] =
    useState('')

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      setUser,
    )
  }, [])

  /* =======================================================
     LOAD MATCH + LIVE DETAILS
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false

    async function load(
      first = false,
    ) {
      if (
        !sport ||
        !matchSlug
      ) {
        setError(
          'Invalid match URL.',
        )
        setLoading(false)
        return
      }

      try {
        if (first) {
          setLoading(true)
        }

        setError('')

        const result =
          await getMatch(
            sport,
            matchSlug,
          )

        if (cancelled) {
          return
        }

        setMatch(result)
        setClockTick(0)

        const details =
          await getMatchDetails(
            result.leagueCode,
            result.id,
          )

        if (!cancelled) {
          setMatchEvents(
            details.events,
          )
        }
      } catch (
        loadError
      ) {
        console.error(
          loadError,
        )

        if (
          !cancelled &&
          first
        ) {
          setError(
            'Could not load this match.',
          )
        }
      } finally {
        if (
          !cancelled &&
          first
        ) {
          setLoading(false)
        }
      }
    }

    load(true)

    const refresh =
      window.setInterval(
        () =>
          load(false),
        20_000,
      )

    return () => {
      cancelled = true
      window.clearInterval(
        refresh,
      )
    }
  }, [
    sport,
    matchSlug,
  ])

  useEffect(() => {
    if (
      !match ||
      !isLiveMatch(match)
    ) {
      setClockTick(0)
      return
    }

    const interval =
      window.setInterval(
        () =>
          setClockTick(
            (value) =>
              value + 1,
          ),
        1000,
      )

    return () =>
      window.clearInterval(
        interval,
      )
  }, [
    match?.id,
    match?.clockSeconds,
    match?.statusText,
    match?.state,
  ])

  /* =======================================================
     COMMUNITY ROOMS
  ======================================================= */

  useEffect(() => {
    if (!match) {
      return
    }

    return subscribeToCommunityRooms(
      match.id,
      setRooms,
    )
  }, [
    match,
  ])

  /* =======================================================
     CREATE ROOM
  ======================================================= */

  async function handleCreateRoom() {
    if (!user) {
      navigate(
        '/login',
      )

      return
    }

    if (!match) {
      return
    }

    if (
      !roomName.trim()
    ) {
      setCreateError(
        'Enter a room name.',
      )

      return
    }

    try {
      setCreating(
        true,
      )

      setCreateError(
        '',
      )

      const roomId =
        await createCommunityRoom(
          {
            matchId:
              match.id,

            sport:
              match.sport,

            name:
              roomName,

            description,

            ownerId:
              user.uid,

            ownerName:
              user.displayName ??
              user.email ??
              'Chattodoo user',

            maxMembers,
          },
        )

      setRoomName('')
      setDescription('')
      setMaxMembers(50)
      setShowCreate(false)

      navigate(
        `/match/${encodeURIComponent(
          match.sport,
        )}/${encodeURIComponent(
          match.id,
        )}/room/${roomId}`,
      )
    } catch (
      createRoomError
    ) {
      console.error(
        createRoomError,
      )

      setCreateError(
        createRoomError instanceof
          Error
          ? createRoomError.message
          : 'Could not create room.',
      )
    } finally {
      setCreating(
        false,
      )
    }
  }

  /* =======================================================
     STATES
  ======================================================= */

  if (loading) {
    return (
      <div className="match-room-page">
        <div className="match-room-state">
          Loading match...
        </div>
      </div>
    )
  }

  if (
    error ||
    !match
  ) {
    return (
      <div className="match-room-page">
        <div className="match-room-state error">
          <h2>
            Match unavailable
          </h2>

          <p>
            {error}
          </p>

          <Link to="/sports">
            ← Back to Sports
          </Link>
        </div>
      </div>
    )
  }

  const officialRoom =
    `/match/${encodeURIComponent(
      match.sport,
    )}/${encodeURIComponent(
      match.id,
    )}/room/public`

  return (
    <div className="match-room-page">
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

          All Sports
        </Link>
      </nav>

      <main className="match-room-content">
        {/* MATCH */}

        <section className="scoreboard">
          <div className="score-team">
            {match.homeLogo ? (
              <img
                src={
                  match.homeLogo
                }
                alt={
                  match.home
                }
              />
            ) : (
              <div className="team-logo-placeholder">
                {match.home
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <h2>
              {match.home}
            </h2>
          </div>

          <div className="big-score">
            <div className="score-numbers">
              <strong>
                {match.homeScore ??
                  '-'}
              </strong>

              <span>
                :
              </span>

              <strong>
                {match.awayScore ??
                  '-'}
              </strong>
            </div>

            <small>
              {isLiveMatch(match)
                ? `LIVE · ${displayLiveClock(
                    match,
                    clockTick,
                  )}`
                : match.statusText ||
                  match.status}
            </small>
          </div>

          <div className="score-team">
            {match.awayLogo ? (
              <img
                src={
                  match.awayLogo
                }
                alt={
                  match.away
                }
              />
            ) : (
              <div className="team-logo-placeholder">
                {match.away
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <h2>
              {match.away}
            </h2>
          </div>
        </section>

        {/* MATCH EVENTS */}

        <section
          className="room-panel"
          style={{
            marginTop: 24,
          }}
        >
          <div className="panel-heading">
            <span>
              ⚡ MATCH EVENTS
            </span>
          </div>

          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 10,
            }}
          >
            {matchEvents.length ===
            0 ? (
              <p
                style={{
                  opacity: 0.65,
                  margin: 0,
                }}
              >
                No goal or card details
                available from the match
                feed yet.
              </p>
            ) : (
              [...matchEvents]
                .reverse()
                .map(
                  (event) => (
                    <div
                      key={
                        event.id
                      }
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          '36px minmax(0,1fr) auto',
                        gap: 12,
                        alignItems:
                          'center',
                        padding:
                          '14px 16px',
                        border:
                          '1px solid rgba(255,255,255,.08)',
                        borderRadius:
                          14,
                        background:
                          'rgba(255,255,255,.025)',
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            20,
                        }}
                      >
                        <EventIcon
                          event={
                            event
                          }
                        />
                      </div>

                      <div
                        style={{
                          minWidth:
                            0,
                        }}
                      >
                        <strong>
                          {event.athlete ||
                            event.text}
                        </strong>

                        {event.type ===
                          'goal' &&
                          event.assist && (
                            <div
                              style={{
                                opacity:
                                  0.68,
                                marginTop:
                                  4,
                                fontSize:
                                  13,
                              }}
                            >
                              Assist:{' '}
                              {
                                event.assist
                              }
                            </div>
                          )}

                        {event.type ===
                          'goal' &&
                          (event.penalty ||
                            event.ownGoal) && (
                            <div
                              style={{
                                opacity:
                                  0.68,
                                marginTop:
                                  4,
                                fontSize:
                                  13,
                              }}
                            >
                              {event.penalty
                                ? 'Penalty'
                                : 'Own goal'}
                            </div>
                          )}
                      </div>

                      <strong
                        style={{
                          color:
                            '#a78bfa',
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {event.minute}
                      </strong>
                    </div>
                  ),
                )
            )}
          </div>
        </section>

        {/* =================================================
            OFFICIAL ROOM
        ================================================= */}

        <section
          className="room-panel"
          style={{
            marginTop:
              32,
          }}
        >
          <div className="panel-heading">
            <span>
              🟣 OFFICIAL MATCH ROOM
            </span>
          </div>

          <div
            style={{
              padding:
                '24px',
            }}
          >
            <h2>
              {match.home}{' '}
              vs{' '}
              {match.away}
            </h2>

            <p
              style={{
                opacity:
                  0.7,
              }}
            >
              The open Chattodoo
              room for everyone
              following this match.
            </p>

            <Link
              to={
                officialRoom
              }
              className="question-button"
            >
              <MessageCircle
                size={16}
              />

              Join Open Room
            </Link>
          </div>
        </section>

        {/* =================================================
            COMMUNITY ROOMS
        ================================================= */}

        <section
          className="room-panel"
          style={{
            marginTop:
              24,
          }}
        >
          <div className="panel-heading">
            <span>
              👥 COMMUNITY ROOMS
            </span>

            <button
              type="button"
              className="question-button"
              onClick={() => {
                if (!user) {
                  navigate(
                    '/login',
                  )

                  return
                }

                setShowCreate(
                  true,
                )
              }}
            >
              <Plus
                size={15}
              />

              Create Room
            </button>
          </div>

          <div
            style={{
              padding:
                20,
            }}
          >
            {rooms.length ===
            0 ? (
              <div className="chat-empty">
                <Users
                  size={34}
                />

                <h3>
                  No community
                  rooms yet
                </h3>

                <p>
                  Create the first
                  room for this
                  match.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display:
                    'grid',
                  gap: 14,
                }}
              >
                {rooms.map(
                  (room) => (
                    <Link
                      key={
                        room.id
                      }
                      to={`/match/${encodeURIComponent(
                        match.sport,
                      )}/${encodeURIComponent(
                        match.id,
                      )}/room/${room.id}`}
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          'minmax(0,1fr) auto',
                        gap: 24,
                        alignItems:
                          'center',
                        padding:
                          '20px 22px',
                        border:
                          '1px solid rgba(255,255,255,.09)',
                        borderRadius:
                          16,
                        background:
                          'linear-gradient(100deg, rgba(255,255,255,.025), rgba(139,92,246,.08))',
                        color:
                          'inherit',
                        textDecoration:
                          'none',
                        minWidth:
                          0,
                      }}
                    >
                      <div
                        style={{
                          minWidth:
                            0,
                        }}
                      >
                        <strong
                          style={{
                            display:
                              'block',
                            fontSize:
                              16,
                            overflowWrap:
                              'anywhere',
                          }}
                        >
                          {room.name}
                        </strong>

                        {room.description && (
                          <p
                            style={{
                              margin:
                                '7px 0 0',
                              opacity:
                                0.66,
                              lineHeight:
                                1.45,
                              overflowWrap:
                                'anywhere',
                            }}
                          >
                            {
                              room.description
                            }
                          </p>
                        )}

                        <span
                          style={{
                            display:
                              'inline-flex',
                            alignItems:
                              'center',
                            gap: 6,
                            marginTop:
                              10,
                            opacity:
                              0.7,
                            fontSize:
                              13,
                          }}
                        >
                          <Users
                            size={14}
                          />
                          Up to{' '}
                          {
                            room.maxMembers
                          }
                        </span>
                      </div>

                      <div
                        style={{
                          textAlign:
                            'right',
                          whiteSpace:
                            'nowrap',
                          opacity:
                            0.85,
                          fontSize:
                            14,
                        }}
                      >
                        Created by{' '}
                        <strong>
                          {
                            room.ownerName
                          }
                        </strong>
                      </div>
                    </Link>
                  ),
                )}
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            CREATE ROOM MODAL
        ================================================= */}

        {showCreate && (
          <div
            style={{
              position:
                'fixed',
              inset: 0,
              background:
                'rgba(0,0,0,.72)',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              padding:
                20,
              zIndex:
                999,
            }}
          >
            <div
              className="room-panel"
              style={{
                width:
                  'min(520px, 100%)',
              }}
            >
              <div className="panel-heading">
                <span>
                  CREATE ROOM
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setShowCreate(
                      false,
                    )
                  }
                >
                  <X
                    size={18}
                  />
                </button>
              </div>

              <div
                style={{
                  padding:
                    24,
                  display:
                    'grid',
                  gap: 18,
                }}
              >
                <label>
                  Room name

                  <input
                    value={
                      roomName
                    }
                    maxLength={
                      60
                    }
                    onChange={(
                      event,
                    ) =>
                      setRoomName(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="e.g. Arsenal fans"
                  />
                </label>

                <label>
                  Description

                  <textarea
                    value={
                      description
                    }
                    maxLength={
                      200
                    }
                    onChange={(
                      event,
                    ) =>
                      setDescription(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="What's this room about?"
                  />
                </label>

                <label>
                  Maximum members

                  <input
                    type="number"
                    min="2"
                    max="500"
                    value={
                      maxMembers
                    }
                    onChange={(
                      event,
                    ) =>
                      setMaxMembers(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                  />
                </label>

                {createError && (
                  <p
                    style={{
                      color:
                        '#ff8080',
                    }}
                  >
                    {
                      createError
                    }
                  </p>
                )}

                <button
                  type="button"
                  className="send-button"
                  onClick={
                    handleCreateRoom
                  }
                  disabled={
                    creating
                  }
                >
                  <Plus
                    size={15}
                  />

                  {creating
                    ? 'Creating...'
                    : 'Create Room'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default MatchRoomPage