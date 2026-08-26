import {
  useEffect,
  useState,
} from 'react'

import {
  ArrowLeft,
  Heart,
  Send,
  Users,
  BarChart3,
  MessageCircle,
} from 'lucide-react'

import {
  Link,
  useParams,
} from 'react-router-dom'

import {
  getMatches,
  type SportMatch,
} from '../lib/sportsApi'

import {
  addReaction,
  joinRoom,
  sendRoomMessage,
  subscribeToMessages,
  subscribeToReactions,
  subscribeToViewerCount,
  type RoomMessage,
  type RoomReactions,
} from '../lib/sportsRoomApi'

function getSportIcon(
  sport: string,
) {
  const icons: Record<
    string,
    string
  > = {
    football: '⚽',
    cricket: '🏏',
    basketball: '🏀',
    tennis: '🎾',
  }

  return (
    icons[
      sport.toLowerCase()
    ] ?? '🏟️'
  )
}

function SportCommunityPage() {
  const { sport } =
    useParams<{
      sport: string
    }>()

  const sportKey =
    sport?.toLowerCase() ??
    ''

  const [
    matches,
    setMatches,
  ] = useState<SportMatch[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    selectedMatch,
    setSelectedMatch,
  ] =
    useState<SportMatch | null>(
      null,
    )

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    messages,
    setMessages,
  ] = useState<RoomMessage[]>([])

  const [
    viewers,
    setViewers,
  ] = useState(0)

  const [
    reactions,
    setReactions,
  ] =
    useState<RoomReactions>({
      heart: 0,
      fire: 0,
      laugh: 0,
      wow: 0,
    })

  const [
    sending,
    setSending,
  ] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!sportKey) {
        setError(
          'Sport not found.',
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const data =
          await getMatches(
            sportKey,
          )

        if (!cancelled) {
          setMatches(data)

          setSelectedMatch(
            data[0] ?? null,
          )
        }
      } catch (err) {
        console.error(err)

        if (!cancelled) {
          setError(
            'Unable to load sports data.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [sportKey])

  /*
   * The room belongs to the
   * currently selected match.
   */

  const roomId =
    selectedMatch
      ? `${sportKey}-${selectedMatch.id}`
      : ''

  useEffect(() => {
    if (!roomId) {
      return
    }

    const unsubscribeMessages =
      subscribeToMessages(
        roomId,
        setMessages,
      )

    const unsubscribeReactions =
      subscribeToReactions(
        roomId,
        setReactions,
      )

    const unsubscribeViewers =
      subscribeToViewerCount(
        roomId,
        setViewers,
      )

    joinRoom(roomId).catch(
      (err) => {
        console.error(
          'Could not join room:',
          err,
        )
      },
    )

    return () => {
      unsubscribeMessages()
      unsubscribeReactions()
      unsubscribeViewers()
    }
  }, [roomId])

  async function handleSendMessage() {
    const trimmed =
      message.trim()

    if (
      !trimmed ||
      sending ||
      !roomId
    ) {
      return
    }

    try {
      setSending(true)

      await sendRoomMessage(
        roomId,
        'Guest',
        trimmed,
      )

      setMessage('')
    } catch (err) {
      console.error(
        'Failed to send message:',
        err,
      )
    } finally {
      setSending(false)
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

    try {
      await addReaction(
        roomId,
        reaction,
      )
    } catch (err) {
      console.error(
        'Failed to send reaction:',
        err,
      )
    }
  }

  if (loading) {
    return (
      <div className="community-page">
        <div className="community-not-found">
          <h1>
            {getSportIcon(
              sportKey,
            )}{' '}
            Loading...
          </h1>

          <p>
            Getting the latest
            match information.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
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
            to="/sports"
          >
            ← All Sports
          </Link>
        </nav>

        <main className="community-content">
          <div className="community-not-found">
            <h1>
              Sports data unavailable
            </h1>

            <p>{error}</p>

            <Link to="/sports">
              ← Back to Sports
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!selectedMatch) {
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
        </nav>

        <main className="community-content">
          <div className="community-not-found">
            <div className="empty-sports-icon">
              {getSportIcon(
                sportKey,
              )}
            </div>

            <h1>
              No matches right now
            </h1>

            <p>
              SportScore returned no
              matches for this sport.
            </p>

            <Link to="/sports">
              ← Back to Sports
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const match =
    selectedMatch

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

        <div className="sports-nav-links">
          <Link to="/">
            Home
          </Link>

          <Link
            className="active"
            to="/sports"
          >
            Sports
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

      <main className="community-content">
        <Link
          className="community-back"
          to="/sports"
        >
          <ArrowLeft size={15} />
          Back to Sports
        </Link>

        <section className="match-room-header">
          <div className="match-room-title">
            <span>
              {getSportIcon(
                match.sport,
              )}{' '}
              {match.sport}
            </span>

            <small>
              {match.competition}
            </small>

            <h1>
              {match.home}

              <br />

              <span>vs</span>

              <br />

              {match.away}
            </h1>
          </div>

          <div className="big-score">
            <div>
              <strong>
                {match.homeScore ??
                  '-'}
              </strong>

              <span>
                {match.home}
              </span>
            </div>

            <div className="score-divider">
              {match.statusText ||
                match.status}
            </div>

            <div>
              <strong>
                {match.awayScore ??
                  '-'}
              </strong>

              <span>
                {match.away}
              </span>
            </div>
          </div>
        </section>

        <section className="live-room">
          <div className="live-room-header">
            <div>
              <span className="live-badge">
                ● SPORTS ROOM
              </span>

              <h2>
                {match.home} vs{' '}
                {match.away}
              </h2>

              <p>
                Join the conversation
                around this match.
              </p>
            </div>

            <div className="live-viewers">
              <Users size={17} />

              <strong>
                {viewers}
              </strong>

              <small>
                watching
              </small>
            </div>
          </div>

          <div className="live-room-body">
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
                    opacity: 0.6,
                  }}
                >
                  {messages.length}{' '}
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
                      Be the first
                      person to start
                      the conversation.
                    </p>
                  </div>
                ) : (
                  messages.map(
                    (item) => (
                      <div
                        className="chat-message"
                        key={
                          item.id
                        }
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
                            {item.name}
                          </strong>

                          <p>
                            {item.text}
                          </p>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>

              <div className="chat-input-area">
                <input
                  value={message}
                  onChange={(
                    event,
                  ) =>
                    setMessage(
                      event.target.value,
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      'Enter'
                    ) {
                      handleSendMessage()
                    }
                  }}
                  placeholder="Write a message..."
                  disabled={sending}
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
                  <Heart size={17} />
                </button>

                <button
                  type="button"
                  className="send-button"
                  onClick={
                    handleSendMessage
                  }
                  disabled={
                    sending ||
                    !message.trim()
                  }
                >
                  <Send size={15} />

                  {sending
                    ? 'Sending...'
                    : 'Send'}
                </button>
              </div>

              <div className="room-reactions">
                <button
                  type="button"
                  onClick={() =>
                    handleReaction(
                      'heart',
                    )
                  }
                >
                  ❤️ {reactions.heart}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleReaction(
                      'fire',
                    )
                  }
                >
                  🔥 {reactions.fire}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleReaction(
                      'laugh',
                    )
                  }
                >
                  😂 {reactions.laugh}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleReaction(
                      'wow',
                    )
                  }
                >
                  ⚡ {reactions.wow}
                </button>
              </div>
            </div>

            <aside className="live-poll">
              <span>
                <BarChart3
                  size={13}
                />

                LIVE POLL
              </span>

              <h3>
                Who wins this match?
              </h3>

              <button type="button">
                <span>
                  {match.home}
                </span>

                <strong>
                  0%
                </strong>
              </button>

              <button type="button">
                <span>
                  {match.away}
                </span>

                <strong>
                  0%
                </strong>
              </button>

              <small>
                0 votes
              </small>
            </aside>
          </div>
        </section>

        <section className="sports-match-section">
          <div className="sports-section-header">
            <div>
              <span className="sports-section-label">
                MORE {sportKey.toUpperCase()}
              </span>

              <h2>
                Other matches
              </h2>
            </div>
          </div>

          <div className="sports-match-grid">
            {matches
              .filter(
                (item) =>
                  item.id !==
                  match.id,
              )
              .slice(0, 6)
              .map(
                (item) => (
                  <Link
                    key={item.id}
                    to={`/match/${encodeURIComponent(
                      item.sport,
                    )}/${encodeURIComponent(
                      item.id,
                    )}`}
                    className="sports-match-card"
                  >
                    <strong>
                      {item.home}
                    </strong>

                    <span>vs</span>

                    <strong>
                      {item.away}
                    </strong>

                    <small>
                      {item.competition}
                    </small>
                  </Link>
                ),
              )}
          </div>
        </section>

        <div className="sports-attribution">
          Data from{' '}

          <a
            href="https://sportscore.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            SportScore
          </a>
        </div>
      </main>
    </div>
  )
}

export default SportCommunityPage