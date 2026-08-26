import {
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  FormEvent,
} from 'react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  onAuthStateChanged,
} from 'firebase/auth'

import { auth } from '../lib/firebase'

import {
  joinWatchRoom,
  leaveWatchRoom,
  sendMessage,
  sendReaction,
  subscribeToMessages,
  subscribeToRoom,
  subscribeToViewers,
  subscribeToReactions,
  updatePlayback,
  type ChatMessage,
  type Viewer,
  type WatchRoom,
  type Reaction,
} from '../lib/watchParty'

import './WatchPartyPage.css'

declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
  }
}

declare namespace YT {
  class Player {
    constructor(
      element: HTMLElement | string,
      options: PlayerOptions,
    )

    playVideo(): void
    pauseVideo(): void
    seekTo(
      seconds: number,
      allowSeekAhead: boolean,
    ): void
    getCurrentTime(): number
    destroy(): void
  }

  interface PlayerOptions {
    width?: string | number
    height?: string | number
    videoId?: string
    playerVars?: Record<string, string | number>
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (
        event: OnStateChangeEvent,
      ) => void
    }
  }

  interface PlayerEvent {
    target: Player
  }

  interface OnStateChangeEvent {
    target: Player
    data: number
  }

  namespace PlayerState {
    const UNSTARTED = -1
    const ENDED = 0
    const PLAYING = 1
    const PAUSED = 2
    const BUFFERING = 3
    const CUED = 5
  }
}

let youtubeApiPromise:
  Promise<void> | null = null

function loadYouTubeAPI() {
  if (window.YT?.Player) {
    return Promise.resolve()
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise
  }

  youtubeApiPromise = new Promise(
    (resolve) => {
      const previousCallback =
        window.onYouTubeIframeAPIReady

      window.onYouTubeIframeAPIReady =
        () => {
          previousCallback?.()
          resolve()
        }

      const existingScript =
        document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]',
        )

      if (existingScript) {
        return
      }

      const script =
        document.createElement(
          'script',
        )

      script.src =
        'https://www.youtube.com/iframe_api'

      script.async = true

      document.body.appendChild(
        script,
      )
    },
  )

  return youtubeApiPromise
}

function getYouTubeVideoId(
  url: string,
) {
  try {
    const parsed =
      new URL(url)

    if (
      parsed.hostname.includes(
        'youtu.be',
      )
    ) {
      return parsed.pathname
        .replace('/', '')
        .split('/')[0]
    }

    if (
      parsed.hostname.includes(
        'youtube.com',
      )
    ) {
      const normalId =
        parsed.searchParams.get(
          'v',
        )

      if (normalId) {
        return normalId
      }

      const parts =
        parsed.pathname.split(
          '/',
        )

      if (
        parts[1] === 'shorts' ||
        parts[1] === 'embed'
      ) {
        return parts[2] || ''
      }
    }

    return ''
  } catch {
    return ''
  }
}

export default function WatchPartyPage() {
  const params =
    useParams<{
      roomId: string
    }>()

  const roomId =
    params.roomId

  const playerContainerRef =
    useRef<HTMLDivElement>(null)

  const playerRef =
    useRef<YT.Player | null>(null)

  const applyingRemoteUpdate =
    useRef(false)

  const lastLocalAction =
    useRef(0)

  const [room, setRoom] =
    useState<WatchRoom | null>(null)

  const [messages, setMessages] =
    useState<ChatMessage[]>([])

  const [viewers, setViewers] =
    useState<Viewer[]>([])

  const [reactions, setReactions] =
    useState<Reaction[]>([])

  const [message, setMessage] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [copied, setCopied] =
    useState(false)

  const [currentUserId, setCurrentUserId] =
    useState('')

  const [currentUsername, setCurrentUsername] =
    useState('You')

  const [playerReady, setPlayerReady] =
    useState(false)

  /* =========================================
     AUTH
     ========================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          if (!user) {
            setCurrentUserId('')
            setCurrentUsername('You')
            return
          }

          setCurrentUserId(user.uid)

          setCurrentUsername(
            user.displayName ||
              user.email?.split('@')[0] ||
              'You',
          )
        },
      )

    return unsubscribe
  }, [])

  /* =========================================
     LOAD ROOM / CHAT / VIEWERS / REACTIONS
     ========================================= */

  useEffect(() => {
    if (!roomId) {
      setError(
        'Watch party not found.',
      )

      setLoading(false)

      return
    }

    const currentRoomId =
      roomId

    const unsubscribeRoom =
      subscribeToRoom(
        currentRoomId,
        (updatedRoom) => {
          if (!updatedRoom) {
            setError(
              'Watch party not found.',
            )
          }

          setRoom(updatedRoom)
          setLoading(false)
        },
      )

    const unsubscribeMessages =
      subscribeToMessages(
        currentRoomId,
        setMessages,
      )

    const unsubscribeViewers =
      subscribeToViewers(
        currentRoomId,
        setViewers,
      )

    const unsubscribeReactions =
      subscribeToReactions(
        currentRoomId,
        setReactions,
      )

    return () => {
      unsubscribeRoom()
      unsubscribeMessages()
      unsubscribeViewers()
      unsubscribeReactions()
    }
  }, [roomId])

  /* =========================================
     JOIN / LEAVE
     ========================================= */

  useEffect(() => {
    if (
      !roomId ||
      !currentUserId
    ) {
      return
    }

    const currentRoomId =
      roomId

    let mounted = true

    async function joinRoom() {
      try {
        await joinWatchRoom(
          currentRoomId,
          currentUserId,
        )
      } catch (joinError) {
        console.error(
          'Failed to join watch room:',
          joinError,
        )

        if (mounted) {
          setError(
            'Could not join this watch party.',
          )
        }
      }
    }

    void joinRoom()

    return () => {
      mounted = false

      void leaveWatchRoom(
        currentRoomId,
        currentUserId,
      ).catch((leaveError) => {
        console.error(
          'Failed to leave watch room:',
          leaveError,
        )
      })
    }
  }, [
    roomId,
    currentUserId,
  ])

  /* =========================================
     CREATE YOUTUBE PLAYER
     ========================================= */

  useEffect(() => {
    if (
      !room ||
      !playerContainerRef.current
    ) {
      return
    }

    const videoId =
      getYouTubeVideoId(
        room.videoUrl,
      )

    if (!videoId) {
      return
    }

    let cancelled = false

    async function createPlayer() {
      await loadYouTubeAPI()

      if (
        cancelled ||
        !playerContainerRef.current
      ) {
        return
      }

      playerRef.current?.destroy()

      playerRef.current =
        new window.YT.Player(
          playerContainerRef.current,
          {
            width: '100%',
            height: '100%',
            videoId,
            playerVars: {
              playsinline: 1,
              controls: 1,
              rel: 0,
              origin:
                window.location.origin,
            },
            events: {
              onReady: handlePlayerReady,
              onStateChange:
                handlePlayerStateChange,
            },
          },
        )
    }

    void createPlayer()

    return () => {
      cancelled = true

      playerRef.current?.destroy()
      playerRef.current = null

      setPlayerReady(false)
    }

    // We intentionally create the player
    // when the room/video changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    room?.videoUrl,
  ])

  /* =========================================
     PLAYER READY
     ========================================= */

  function handlePlayerReady(
    event: YT.PlayerEvent,
  ) {
    playerRef.current =
      event.target

    setPlayerReady(true)

    syncPlayerFromRoom(
      event.target,
    )
  }

  /* =========================================
     PLAYER STATE CHANGE
     ========================================= */

  function handlePlayerStateChange(
    event: YT.OnStateChangeEvent,
  ) {
    if (
      applyingRemoteUpdate.current
    ) {
      return
    }

    if (!roomId) {
      return
    }

    const now =
      Date.now()

    /*
      Ignore state events generated
      immediately after our own Firebase
      synchronization.
    */

    if (
      now -
        lastLocalAction.current <
      500
    ) {
      return
    }

    if (
      event.data ===
      window.YT.PlayerState.PLAYING
    ) {
      const currentTime =
        event.target.getCurrentTime()

      lastLocalAction.current =
        now

      void updatePlayback(
        roomId,
        true,
        currentTime,
      )
    }

    if (
      event.data ===
      window.YT.PlayerState.PAUSED
    ) {
      const currentTime =
        event.target.getCurrentTime()

      lastLocalAction.current =
        now

      void updatePlayback(
        roomId,
        false,
        currentTime,
      )
    }

    if (
      event.data ===
      window.YT.PlayerState.ENDED
    ) {
      lastLocalAction.current =
        now

      void updatePlayback(
        roomId,
        false,
        0,
      )
    }
  }

  /* =========================================
     SYNC PLAYER FROM FIREBASE
     ========================================= */

  function syncPlayerFromRoom(
    player: YT.Player,
  ) {
    if (!room) {
      return
    }

    applyingRemoteUpdate.current =
      true

    let targetTime =
      room.currentTime ?? 0

    if (
      room.isPlaying &&
      room.lastUpdatedAt
    ) {
      const elapsed =
        (Date.now() -
          room.lastUpdatedAt) /
        1000

      targetTime += elapsed
    }

    const currentTime =
      player.getCurrentTime()

    if (
      Math.abs(
        currentTime -
          targetTime,
      ) > 1.5
    ) {
      player.seekTo(
        targetTime,
        true,
      )
    }

    if (room.isPlaying) {
      player.playVideo()
    } else {
      player.pauseVideo()
    }

    window.setTimeout(() => {
      applyingRemoteUpdate.current =
        false
    }, 700)
  }

  /* =========================================
     SYNC WHEN FIREBASE ROOM CHANGES
     ========================================= */

  useEffect(() => {
    if (
      !room ||
      !playerReady ||
      !playerRef.current
    ) {
      return
    }

    syncPlayerFromRoom(
      playerRef.current,
    )

    // Only respond to Firebase room
    // playback changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    room?.isPlaying,
    room?.currentTime,
    room?.lastUpdatedAt,
    playerReady,
  ])

  /* =========================================
     CHAT
     ========================================= */

  async function handleSendMessage(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (
      !roomId ||
      !currentUserId
    ) {
      return
    }

    const trimmed =
      message.trim()

    if (!trimmed) {
      return
    }

    try {
      await sendMessage(
        roomId,
        currentUserId,
        currentUsername,
        trimmed,
      )

      setMessage('')
    } catch (messageError) {
      console.error(
        'Failed to send message:',
        messageError,
      )
    }
  }

  /* =========================================
     REACTIONS
     ========================================= */

  async function handleReaction(
    emoji: string,
  ) {
    if (
      !roomId ||
      !currentUserId
    ) {
      return
    }

    try {
      await sendReaction(
        roomId,
        currentUserId,
        emoji,
      )
    } catch (reactionError) {
      console.error(
        'Failed to send reaction:',
        reactionError,
      )
    }
  }

  /* =========================================
     COPY INVITE
     ========================================= */

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(
        window.location.href,
      )

      setCopied(true)

      window.setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (copyError) {
      console.error(
        'Failed to copy invite:',
        copyError,
      )

      window.prompt(
        'Copy this watch party link:',
        window.location.href,
      )
    }
  }

  /* =========================================
     LOADING
     ========================================= */

  if (loading) {
    return (
      <main className="watch-page loading-screen">
        <div>
          <span className="loading-dot" />

          Loading watch party...
        </div>
      </main>
    )
  }

  /* =========================================
     ERROR
     ========================================= */

  if (
    error ||
    !room
  ) {
    return (
      <main className="watch-page error-screen">
        <h1>
          Watch party not found
        </h1>

        <p>
          This room may have been
          deleted or the link may
          be incorrect.
        </p>

        <Link to="/movies">
          ← Back to Movies
        </Link>
      </main>
    )
  }

  const isYouTube =
    Boolean(
      getYouTubeVideoId(
        room.videoUrl,
      ),
    )

  /* =========================================
     UI
     ========================================= */

  return (
    <main className="watch-page">

      {/* NAVBAR */}

      <nav className="watch-navbar">

        <Link
          to="/"
          className="watch-logo"
        >
          CHATTODOO<span>.</span>
        </Link>

        <div className="watch-room-title">
          <span className="watch-live-dot" />

          {room.name}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >

          <button
            type="button"
            className="share-button"
            onClick={
              handleCopyInvite
            }
          >
            {copied
              ? '✓ Link copied!'
              : '🔗 Invite'}
          </button>

          <Link
            to="/movies"
            className="leave-room"
          >
            Leave
          </Link>

        </div>

      </nav>

      {/* MAIN */}

      <section className="watch-layout">

        {/* VIDEO */}

        <div className="video-section">

          <div className="video-wrapper">

            {isYouTube ? (
              <div
                ref={
                  playerContainerRef
                }
                style={{
                  width: '100%',
                  height: '100%',
                }}
              />
            ) : (
              <video
                src={room.videoUrl}
                controls
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit:
                    'contain',
                  background:
                    '#000',
                }}
              />
            )}

          </div>

          {/* VIDEO INFO */}

          <div className="video-information">

            <div>

              <span>
                WATCHING TOGETHER
              </span>

              <h1>
                {room.name}
              </h1>

            </div>

            <button
              className="share-button"
              onClick={() => {
                void handleCopyInvite()
              }}
            >
              🔗 Copy invite
            </button>

          </div>

          {/* VIEWERS */}

          <div className="watching-bar">

            <div className="avatars">

              {viewers
                .slice(0, 5)
                .map(
                  (
                    viewer,
                    index,
                  ) => (
                    <span
                      key={
                        viewer.userId
                      }
                      title={
                        viewer.userId ===
                        currentUserId
                          ? currentUsername
                          : 'Viewer'
                      }
                    >
                      {viewer.userId ===
                      currentUserId
                        ? currentUsername[0]?.toUpperCase()
                        : String.fromCharCode(
                            65 +
                              index,
                          )}
                    </span>
                  ),
                )}

            </div>

            <div>

              <strong>
                {viewers.length}{' '}
                {viewers.length ===
                1
                  ? 'person'
                  : 'people'}
              </strong>

              <small>
                {' '}
                {viewers.length ===
                1
                  ? 'is'
                  : 'are'}{' '}
                watching
              </small>

            </div>

          </div>

        </div>

        {/* CHAT */}

        <aside className="chat-panel">

          <div className="chat-header">

            <div>

              <span>
                LIVE CHAT
              </span>

              <h2>
                Talk while watching
              </h2>

            </div>

            <span className="online-count">
              ● {viewers.length}{' '}
              LIVE
            </span>

          </div>

          {/* REACTIONS */}

          <div className="reaction-row">

            {[
              '❤️',
              '😂',
              '🔥',
              '😱',
              '👏',
            ].map(
              (emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() =>
                    void handleReaction(
                      emoji,
                    )
                  }
                >
                  {emoji}
                </button>
              ),
            )}

          </div>

          {/* REACTIONS */}

          {reactions.length >
            0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding:
                  '8px 18px',
                minHeight:
                  '38px',
                alignItems:
                  'center',
              }}
            >
              {reactions
                .slice(-8)
                .map(
                  (reaction) => (
                    <span
                      key={
                        reaction.id
                      }
                      style={{
                        fontSize:
                          '1.4rem',
                      }}
                    >
                      {
                        reaction.emoji
                      }
                    </span>
                  ),
                )}
            </div>
          )}

          {/* MESSAGES */}

          <div className="messages">

            {messages.length ===
            0 ? (
              <div className="empty-chat">

                <span>
                  🍿
                </span>

                <p>
                  You're the first
                  one here.
                </p>

                <small>
                  Say something and
                  start the
                  conversation.
                </small>

              </div>
            ) : (
              messages.map(
                (item) => (
                  <div
                    className="chat-message"
                    key={item.id}
                  >

                    <div className="chat-avatar">
                      {item.username[0]?.toUpperCase()}
                    </div>

                    <div>

                      <strong>
                        {item.username}
                      </strong>

                      <p>
                        {item.message}
                      </p>

                    </div>

                  </div>
                ),
              )
            )}

          </div>

          {/* INPUT */}

          <form
            className="message-form"
            onSubmit={
              handleSendMessage
            }
          >

            <input
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value,
                )
              }
              placeholder="Say something..."
              maxLength={500}
            />

            <button type="submit">
              →
            </button>

          </form>

        </aside>

      </section>

    </main>
  )
}