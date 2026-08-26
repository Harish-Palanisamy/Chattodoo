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
  Users,
} from 'lucide-react'

import {
  auth,
} from '../lib/firebase'

import {
  addCommunityReaction,
  getCommunityRoom,
  joinCommunityRoom,
  leaveCommunityRoom,
  sendCommunityMessage,
  subscribeToCommunityMessages,
  subscribeToCommunityReactions,
  subscribeToCommunityViewerCount,
  type CommunityRoom,
  type RoomMessage,
  type RoomReactions,
} from '../lib/sportsRoomApi'

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
  ])

  /* =======================================================
     REALTIME ROOM
  ======================================================= */

  useEffect(() => {
    if (
      !room ||
      !roomId
    ) {
      return
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
      (
        joinError,
      ) => {
        console.error(
          joinError,
        )

        setError(
          joinError instanceof
            Error
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

      await sendCommunityMessage(
        roomId,

        user?.displayName ??
          user?.email ??
          'Guest',

        message,

        user?.uid,
      )

      setMessage('')
    } finally {
      setSending(
        false,
      )
    }
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
                ● COMMUNITY ROOM
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
                Created by{' '}
                {
                  room.ownerName
                }
              </small>
            </div>

            <div className="live-viewers">
              <Users
                size={17}
              />

              <strong>
                {viewers}
              </strong>

              <small>
                /{' '}
                {
                  room.maxMembers
                }
              </small>
            </div>
          </div>

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
                  addCommunityReaction(
                    room.id,
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
                  addCommunityReaction(
                    room.id,
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
                  addCommunityReaction(
                    room.id,
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
                  addCommunityReaction(
                    room.id,
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
                  addCommunityReaction(
                    room.id,
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