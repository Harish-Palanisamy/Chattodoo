import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

import {
  Heart,
  MessageCircle,
  Send,
  Share2,
  Users,
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
  addReaction,
  addCommunityReaction,
  getCommunityRoom,
  joinRoom,
  joinCommunityRoom,
  leaveRoom,
  leaveCommunityRoom,
  sendRoomMessage,
  sendCommunityMessage,
  subscribeToMessages,
  subscribeToReactions,
  subscribeToViewerCount,
  subscribeToCommunityMessages,
  subscribeToCommunityReactions,
  subscribeToCommunityViewerCount,
  type CommunityRoom,
  type RoomMessage,
  type RoomReactions,
} from '../lib/sportsRoomApi'

function liveClockText(
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

function MatchEventIcon({
  event,
}: {
  event: MatchEvent
}) {
  if (
    event.type === 'goal'
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

function CommunityRoomPage() {
  const {
    sport,
    matchSlug,
    roomId,
  } = useParams<{
    sport: string
    matchSlug: string
    roomId: string
  }>()

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
    room,
    setRoom,
  ] =
    useState<
      CommunityRoom | null
    >(null)

  const [
    messages,
    setMessages,
  ] =
    useState<
      RoomMessage[]
    >([])

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
    viewers,
    setViewers,
  ] =
    useState(0)

  const [
    message,
    setMessage,
  ] =
    useState('')

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
    sending,
    setSending,
  ] =
    useState(false)

  const [
    shareStatus,
    setShareStatus,
  ] =
    useState('Share Room')

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
    if (
      !sport ||
      !matchSlug
    ) {
      return
    }

    let cancelled =
      false

    async function loadMatchData() {
      try {
        const result =
          await getMatch(
            sport!,
            matchSlug!,
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
        matchError
      ) {
        console.error(
          'Could not load match inside room:',
          matchError,
        )
      }
    }

    loadMatchData()

    const refresh =
      window.setInterval(
        loadMatchData,
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
     LOAD ROOM
  ======================================================= */

  useEffect(() => {
    if (!roomId) {
      setError(
        'Invalid room URL.',
      )

      setLoading(
        false,
      )

      return
    }

    let mounted =
      true

    async function load() {
      try {
        if (roomId === 'public') {
          if (!mounted) {
            return
          }

          setRoom({
            id: 'public',
            matchId: matchSlug ?? '',
            sport: sport ?? 'football',
            name: 'Official Match Room',
            description:
              'The open Chattodoo room for everyone following this match.',
            ownerId: 'chattodoo',
            ownerName: 'Chattodoo',
            maxMembers: 500,
            createdAt: Date.now(),
            type: 'community',
          })

          return
        }

        const result =
          await getCommunityRoom(
            roomId!,
          )

        if (!mounted) {
          return
        }

        if (!result) {
          setError(
            'Room not found.',
          )

          return
        }

        setRoom(
          result,
        )
      } catch (
        loadError
      ) {
        console.error(
          loadError,
        )

        if (
          mounted
        ) {
          setError(
            'Could not load room.',
          )
        }
      } finally {
        if (
          mounted
        ) {
          setLoading(
            false,
          )
        }
      }
    }

    load()

    return () => {
      mounted =
        false
    }
  }, [
    roomId,
    matchSlug,
    sport,
  ])

  /* =======================================================
     REALTIME ROOM
  ======================================================= */

  const isPublicRoom =
    roomId === 'public'

  const officialRoomId =
    matchSlug ?? ''

  useEffect(() => {
    if (
      !room ||
      !roomId
    ) {
      return
    }

    if (isPublicRoom) {
      if (!officialRoomId) {
        setError(
          'Invalid official room URL.',
        )

        return
      }

      const unsubscribeMessages =
        subscribeToMessages(
          officialRoomId,
          setMessages,
        )

      const unsubscribeReactions =
        subscribeToReactions(
          officialRoomId,
          setReactions,
        )

      const unsubscribeViewers =
        subscribeToViewerCount(
          officialRoomId,
          setViewers,
        )

      joinRoom(
        officialRoomId,
      ).catch(
        (joinError) => {
          console.error(
            joinError,
          )

          setError(
            joinError instanceof Error
              ? joinError.message
              : 'Could not join official room.',
          )
        },
      )

      return () => {
        unsubscribeMessages()
        unsubscribeReactions()
        unsubscribeViewers()

        leaveRoom(
          officialRoomId,
        ).catch(
          console.error,
        )
      }
    }

    const unsubscribeMessages =
      subscribeToCommunityMessages(
        roomId,
        setMessages,
      )

    const unsubscribeReactions =
      subscribeToCommunityReactions(
        roomId,
        setReactions,
      )

    const unsubscribeViewers =
      subscribeToCommunityViewerCount(
        roomId,
        setViewers,
      )

    joinCommunityRoom(
      roomId,
      room.maxMembers,
      user?.uid,
    ).catch(
      (joinError) => {
        console.error(
          joinError,
        )

        setError(
          joinError instanceof Error
            ? joinError.message
            : 'Could not join room.',
        )
      },
    )

    return () => {
      unsubscribeMessages()
      unsubscribeReactions()
      unsubscribeViewers()

      leaveCommunityRoom(
        roomId,
      ).catch(
        console.error,
      )
    }
  }, [
    room,
    roomId,
    user,
    isPublicRoom,
    officialRoomId,
  ])

  /* =======================================================
     SEND
  ======================================================= */

  async function sendMessage() {
    if (
      !roomId ||
      !message.trim() ||
      sending
    ) {
      return
    }

    try {
      setSending(
        true,
      )

      if (isPublicRoom) {
        await sendRoomMessage(
          officialRoomId,

          user?.displayName ??
            user?.email ??
            'Guest',

          message,

          user?.uid,
        )
      } else {
        await sendCommunityMessage(
          roomId,

          user?.displayName ??
            user?.email ??
            'Guest',

          message,

          user?.uid,
        )
      }

      setMessage('')
    } finally {
      setSending(
        false,
      )
    }
  }

  async function shareRoom() {
    const url =
      window.location.href

    const title =
      room?.name ??
      'Chattodoo Room'

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title,
          text:
            `Join me in ${title} on Chattodoo`,
          url,
        })

        return
      }

      await navigator.clipboard.writeText(
        url,
      )

      setShareStatus(
        'Link copied!',
      )

      window.setTimeout(
        () => {
          setShareStatus(
            'Share Room',
          )
        },
        1800,
      )
    } catch (shareError) {
      // Closing the native share sheet is not an app error.
      if (
        shareError instanceof DOMException &&
        shareError.name === 'AbortError'
      ) {
        return
      }

      console.error(
        shareError,
      )

      // Clipboard fallback for browsers where navigator.share exists
      // but cannot complete the share operation.
      try {
        await navigator.clipboard.writeText(
          url,
        )

        setShareStatus(
          'Link copied!',
        )

        window.setTimeout(
          () => {
            setShareStatus(
              'Share Room',
            )
          },
          1800,
        )
      } catch (
        clipboardError
      ) {
        console.error(
          clipboardError,
        )

        setShareStatus(
          'Could not share',
        )

        window.setTimeout(
          () => {
            setShareStatus(
              'Share Room',
            )
          },
          1800,
        )
      }
    }
  }

  async function handleReaction(
    reaction:
      | 'heart'
      | 'fire'
      | 'laugh'
      | 'wow',
  ) {
    if (!roomId) {
      return
    }

    if (isPublicRoom) {
      await addReaction(
        officialRoomId,
        reaction,
      )

      return
    }

    await addCommunityReaction(
      roomId,
      reaction,
    )
  }

  /* =======================================================
     STATES
  ======================================================= */

  if (loading) {
    return (
      <div className="community-page">
        <div className="community-not-found">
          Loading room...
        </div>
      </div>
    )
  }

  if (
    error &&
    !room
  ) {
    return (
      <div className="community-page">
        <div className="community-not-found">
          <h2>
            Room unavailable
          </h2>

          <p>
            {error}
          </p>

          <Link
            to="/sports"
          >
            Back to Sports
          </Link>
        </div>
      </div>
    )
  }

  if (!room) {
    return null
  }

  const homeEvents =
    match
      ? matchEvents.filter(
          (event) =>
            Boolean(
              match.homeTeamId &&
              event.teamId ===
                match.homeTeamId,
            ),
        )
      : []

  const awayEvents =
    match
      ? matchEvents.filter(
          (event) =>
            Boolean(
              match.awayTeamId &&
              event.teamId ===
                match.awayTeamId,
            ),
        )
      : []

  function TeamEvents({
    events,
    align,
  }: {
    events: MatchEvent[]
    align: 'left' | 'right'
  }) {
    if (events.length === 0) {
      return null
    }

    return (
      <div
        style={{
          display: 'grid',
          gap: 8,
          marginTop: 12,
          justifyItems:
            align === 'right'
              ? 'end'
              : 'start',
          width: '100%',
        }}
      >
        {events.map(
          (event) => (
            <div
              key={event.id}
              style={{
                display: 'grid',
                gap: 3,
                textAlign: align,
                width: '100%',
                maxWidth: 280,
                padding: '7px 9px',
                borderRadius: 10,
                background:
                  'rgba(255,255,255,.035)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    align === 'right'
                      ? 'flex-end'
                      : 'flex-start',
                  gap: 7,
                  fontSize: 13,
                  flexWrap: 'wrap',
                }}
              >
                <MatchEventIcon
                  event={event}
                />

                <strong>
                  {event.athlete ||
                    event.text}
                </strong>

                {event.minute && (
                  <span
                    style={{
                      color: '#c084fc',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {event.minute}
                  </span>
                )}
              </div>

              {event.type ===
                'goal' &&
                event.assist && (
                  <small
                    style={{
                      opacity: 0.64,
                    }}
                  >
                    Assist: {event.assist}
                  </small>
                )}
            </div>
          ),
        )}
      </div>
    )
  }

  return (
    <div className="community-page">
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
          to={`/match/${sport}/${matchSlug}`}
        >
          ← Match Rooms
        </Link>
      </nav>

      <main className="community-content">
        {/* ROOM HEADER */}

        <section className="live-room">
          <div className="live-room-header">
            <div>
              <span className="live-badge">
                {isPublicRoom
                  ? '● OFFICIAL MATCH ROOM'
                  : '● COMMUNITY ROOM'}
              </span>

              <h1>
                {room.name}
              </h1>

              {room.description && (
                <p>
                  {
                    room.description
                  }
                </p>
              )}

              <small>
                {isPublicRoom
                  ? 'Open to everyone following this match'
                  : `Created by ${room.ownerName}`}
              </small>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={
                  shareRoom
                }
                className="send-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
              >
                <Share2
                  size={16}
                />

                {shareStatus}
              </button>

              <div className="live-viewers">
                <Users
                  size={17}
                />

                <strong>
                  {viewers}
                </strong>

                <small>
                  {isPublicRoom
                    ? ' online'
                    : ` / ${room.maxMembers}`}
                </small>
              </div>
            </div>
          </div>

          {/* SCORECARD INSIDE ROOM */}

          {match && (
            <div
              style={{
                margin: '18px 20px 0',
                border:
                  '1px solid rgba(255,255,255,.09)',
                borderRadius: 18,
                overflow: 'hidden',
                background:
                  'linear-gradient(135deg, rgba(139,92,246,.12), rgba(255,255,255,.025))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  gap: 16,
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderBottom:
                    '1px solid rgba(255,255,255,.08)',
                  flexWrap: 'wrap',
                }}
              >
                <strong>
                  {match.competition}
                </strong>

                <strong
                  style={{
                    color:
                      isLiveMatch(match)
                        ? '#c084fc'
                        : 'inherit',
                  }}
                >
                  {isLiveMatch(match)
                    ? `● LIVE · ${liveClockText(
                        match,
                        clockTick,
                      )}`
                    : match.statusText ||
                      match.status}
                </strong>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(0,1fr) auto minmax(0,1fr)',
                  gap: 22,
                  alignItems: 'start',
                  padding: '24px 18px',
                }}
              >
                {/* HOME TEAM + HOME EVENTS */}
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {match.homeLogo && (
                      <img
                        src={match.homeLogo}
                        alt=""
                        style={{
                          width: 44,
                          height: 44,
                          objectFit: 'contain',
                        }}
                      />
                    )}

                    <strong
                      style={{
                        overflowWrap:
                          'anywhere',
                        fontSize: 16,
                      }}
                    >
                      {match.home}
                    </strong>
                  </div>

                  {homeEvents.length > 0 && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 10,
                        borderTop:
                          '1px solid rgba(255,255,255,.07)',
                      }}
                    >
                      <TeamEvents
                        events={homeEvents}
                        align="left"
                      />
                    </div>
                  )}
                </div>

                {/* SCORE */}
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    paddingTop: 7,
                  }}
                >
                  {match.homeScore ?? '—'}
                  <span
                    style={{
                      opacity: 0.45,
                      margin: '0 8px',
                    }}
                  >
                    –
                  </span>
                  {match.awayScore ?? '—'}
                </div>

                {/* AWAY TEAM + AWAY EVENTS */}
                <div
                  style={{
                    minWidth: 0,
                    textAlign: 'right',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:
                        'flex-end',
                      gap: 12,
                    }}
                  >
                    <strong
                      style={{
                        overflowWrap:
                          'anywhere',
                        fontSize: 16,
                      }}
                    >
                      {match.away}
                    </strong>

                    {match.awayLogo && (
                      <img
                        src={match.awayLogo}
                        alt=""
                        style={{
                          width: 44,
                          height: 44,
                          objectFit: 'contain',
                        }}
                      />
                    )}
                  </div>

                  {awayEvents.length > 0 && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 10,
                        borderTop:
                          '1px solid rgba(255,255,255,.07)',
                      }}
                    >
                      <TeamEvents
                        events={awayEvents}
                        align="right"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CHAT */}

          <div className="chat-area">
            <div className="chat-title">
              <MessageCircle
                size={15}
              />

              Live conversation

              <span
                style={{
                  marginLeft:
                    'auto',
                  opacity:
                    0.6,
                }}
              >
                {
                  messages.length
                }{' '}
                messages
              </span>
            </div>

            <div className="chat-messages">
              {messages.length ===
              0 ? (
                <div className="chat-empty">
                  <MessageCircle
                    size={32}
                  />

                  <h3>
                    No messages yet
                  </h3>

                  <p>
                    Start the
                    conversation.
                  </p>
                </div>
              ) : (
                messages.map(
                  (
                    item,
                  ) => (
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

            {/* INPUT */}

            <div className="chat-input-area">
              <input
                value={
                  message
                }
                onChange={(
                  event,
                ) =>
                  setMessage(
                    event
                      .target
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
                placeholder="Write a message..."
              />

              <button
                type="button"
                className="reaction-button"
                onClick={() =>
                  handleReaction(
                    'heart',
                  )
                }
              >
                <Heart
                  size={17}
                />
              </button>

              <button
                type="button"
                className="send-button"
                onClick={
                  sendMessage
                }
                disabled={
                  sending ||
                  !message.trim()
                }
              >
                <Send
                  size={15}
                />

                Send
              </button>
            </div>

            {/* REACTIONS */}

            <div className="room-reactions">
              <button
                onClick={() =>
                  handleReaction(
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
                onClick={() =>
                  handleReaction(
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
                onClick={() =>
                  handleReaction(
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
                onClick={() =>
                  handleReaction(
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
      </main>
    </div>
  )
}

export default CommunityRoomPage