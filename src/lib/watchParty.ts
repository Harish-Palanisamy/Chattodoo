import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'

import { database } from './firebase'

/* =========================================
   TYPES
   ========================================= */

export interface WatchRoom {
  id: string
  name: string
  hostId: string
  videoUrl: string
  isPlaying: boolean
  currentTime: number
  lastUpdatedAt: number
  createdAt: number
}

export interface ChatMessage {
  id: string
  userId: string
  username: string
  message: string
  createdAt: number
}

export interface Viewer {
  id: string
  userId: string
  joinedAt: number
}

export interface Reaction {
  id: string
  userId: string
  emoji: string
  createdAt: number
}

/* =========================================
   WATCH ROOMS
   ========================================= */

export function subscribeToWatchRooms(
  callback: (rooms: WatchRoom[]) => void,
) {
  const roomsRef = ref(
    database,
    'watchRooms',
  )

  return onValue(
    roomsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback([])
        return
      }

      const data = snapshot.val()

      const rooms: WatchRoom[] =
        Object.entries(data).map(
          ([id, value]) => ({
            id,
            ...(value as Omit<
              WatchRoom,
              'id'
            >),
          }),
        )

      rooms.sort(
        (a, b) =>
          (b.createdAt ?? 0) -
          (a.createdAt ?? 0),
      )

      callback(rooms)
    },
  )
}

/* =========================================
   CREATE ROOM
   ========================================= */

export async function createWatchRoom(
  name: string,
  hostId: string,
  videoUrl: string,
) {
  const roomsRef = ref(
    database,
    'watchRooms',
  )

  const roomRef = push(roomsRef)

  const room = {
    name,
    hostId,
    videoUrl,
    isPlaying: false,
    currentTime: 0,
    lastUpdatedAt:
      serverTimestamp(),
    createdAt:
      serverTimestamp(),
  }

  await set(roomRef, room)

  return roomRef.key
}

/* =========================================
   SINGLE ROOM
   ========================================= */

export function subscribeToRoom(
  roomId: string,
  callback: (
    room: WatchRoom | null,
  ) => void,
) {
  const roomRef = ref(
    database,
    `watchRooms/${roomId}`,
  )

  return onValue(
    roomRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null)
        return
      }

      callback({
        id: roomId,
        ...snapshot.val(),
      })
    },
  )
}

/* =========================================
   PLAYBACK
   ========================================= */

export async function updatePlayback(
  roomId: string,
  isPlaying: boolean,
  currentTime: number,
) {
  const roomRef = ref(
    database,
    `watchRooms/${roomId}`,
  )

  await update(roomRef, {
    isPlaying,
    currentTime,
    lastUpdatedAt:
      serverTimestamp(),
  })
}

/* =========================================
   CHAT
   ========================================= */

export async function sendMessage(
  roomId: string,
  userId: string,
  username: string,
  message: string,
) {
  const messagesRef = ref(
    database,
    `watchMessages/${roomId}`,
  )

  const messageRef =
    push(messagesRef)

  await set(messageRef, {
    userId,
    username,
    message,
    createdAt:
      serverTimestamp(),
  })
}

export function subscribeToMessages(
  roomId: string,
  callback: (
    messages: ChatMessage[],
  ) => void,
) {
  const messagesRef = ref(
    database,
    `watchMessages/${roomId}`,
  )

  return onValue(
    messagesRef,
    (snapshot) => {
      const data =
        snapshot.val()

      if (!data) {
        callback([])
        return
      }

      const messages: ChatMessage[] =
        Object.entries(data).map(
          ([id, value]) => ({
            id,
            ...(value as Omit<
              ChatMessage,
              'id'
            >),
          }),
        )

      messages.sort(
        (a, b) =>
          (a.createdAt ?? 0) -
          (b.createdAt ?? 0),
      )

      callback(messages)
    },
  )
}

/* =========================================
   UNIQUE TAB ID
   ========================================= */

/*
  IMPORTANT:

  Firebase UID identifies the USER.

  But for presence we need to identify
  the BROWSER TAB.

  Example:

  Same user:
    Tab 1 → viewer-abc123
    Tab 2 → viewer-xyz789

  Therefore both tabs appear as
  separate viewers.
*/

function getViewerId() {
  const storageKey =
    'chattodoo-viewer-id'

  const existingId =
    sessionStorage.getItem(
      storageKey,
    )

  if (existingId) {
    return existingId
  }

  const newId =
    `viewer-${Math.random()
      .toString(36)
      .slice(2, 11)}`

  sessionStorage.setItem(
    storageKey,
    newId,
  )

  return newId
}

/* =========================================
   JOIN ROOM
   ========================================= */

export async function joinWatchRoom(
  roomId: string,
  userId: string,
) {
  /*
    NEVER use the Firebase UID as the
    Firebase presence key.

    Every browser tab gets its own ID.
  */

  const viewerId =
    getViewerId()

  const viewerRef = ref(
    database,
    `watchPresence/${roomId}/${viewerId}`,
  )

  /*
    Register disconnect handling BEFORE
    writing the viewer.
  */

  await onDisconnect(
    viewerRef,
  ).remove()

  /*
    Store both IDs:

    viewerId = unique browser tab
    userId   = actual Firebase user
  */

  await set(viewerRef, {
    userId,
    joinedAt:
      serverTimestamp(),
  })

  console.log(
    'Joined watch room:',
    roomId,
    'viewer:',
    viewerId,
    'user:',
    userId,
  )
}

/* =========================================
   LEAVE ROOM
   ========================================= */

export async function leaveWatchRoom(
  roomId: string,
  _userId: string,
) {
  /*
    Use the same tab ID that was used
    when joining.

    This means Tab 1 only removes
    Tab 1's presence.
  */

  const viewerId =
    getViewerId()

  const viewerRef = ref(
    database,
    `watchPresence/${roomId}/${viewerId}`,
  )

  /*
    Cancel automatic disconnect.
  */

  await onDisconnect(
    viewerRef,
  ).cancel()

  /*
    Remove this browser tab only.
  */

  await remove(viewerRef)

  console.log(
    'Left watch room:',
    roomId,
    'viewer:',
    viewerId,
  )
}

/* =========================================
   SUBSCRIBE TO VIEWERS
   ========================================= */

export function subscribeToViewers(
  roomId: string,
  callback: (
    viewers: Viewer[],
  ) => void,
) {
  const viewersRef = ref(
    database,
    `watchPresence/${roomId}`,
  )

  return onValue(
    viewersRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback([])
        return
      }

      const data =
        snapshot.val()

      const viewers: Viewer[] =
        Object.entries(data).map(
          ([viewerId, value]) => {
            const viewer =
              value as {
                userId?: string
                joinedAt?: number
              }

            return {
              id: viewerId,

              userId:
                viewer.userId ??
                viewerId,

              joinedAt:
                viewer.joinedAt ??
                0,
            }
          },
        )

      callback(viewers)
    },
  )
}

/* =========================================
   REACTIONS
   ========================================= */

export async function sendReaction(
  roomId: string,
  userId: string,
  emoji: string,
) {
  const reactionsRef = ref(
    database,
    `watchReactions/${roomId}`,
  )

  const reactionRef =
    push(reactionsRef)

  await set(reactionRef, {
    userId,
    emoji,
    createdAt:
      serverTimestamp(),
  })

  /*
    Reactions are temporary events.
    Remove after 5 seconds.
  */

  window.setTimeout(() => {
    void remove(reactionRef).catch(
      (error) => {
        console.error(
          'Failed to remove reaction:',
          error,
        )
      },
    )
  }, 5000)
}

export function subscribeToReactions(
  roomId: string,
  callback: (
    reactions: Reaction[],
  ) => void,
) {
  const reactionsRef = ref(
    database,
    `watchReactions/${roomId}`,
  )

  return onValue(
    reactionsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback([])
        return
      }

      const data =
        snapshot.val()

      const reactions: Reaction[] =
        Object.entries(data).map(
          ([id, value]) => ({
            id,
            ...(value as Omit<
              Reaction,
              'id'
            >),
          }),
        )

      callback(reactions)
    },
  )
}