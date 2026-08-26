import {
  get,
  increment,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'

import {
  database,
} from './firebase'

/* =========================================================
   TYPES
========================================================= */

export type RoomMessage = {
  id: string
  name: string
  text: string
  uid?: string
  createdAt: number
}

export type RoomReactions = {
  heart: number
  fire: number
  laugh: number
  wow: number
}

export type CommunityRoom = {
  id: string

  matchId: string
  sport: string

  name: string
  description: string

  ownerId: string
  ownerName: string

  maxMembers: number

  createdAt: number

  type: 'community'
}

export type CreateCommunityRoomInput = {
  matchId: string
  sport: string

  name: string
  description: string

  ownerId: string
  ownerName: string

  maxMembers: number
}

/* =========================================================
   SESSION ID

   One browser tab = one viewer.
========================================================= */

const viewerSessionId =
  crypto.randomUUID()

/* =========================================================
   ROOM PATH HELPERS
========================================================= */

function officialRoomPath(
  roomId: string,
) {
  return `sportsRooms/${roomId}`
}

function communityRoomPath(
  roomId: string,
) {
  return `communityRooms/${roomId}`
}

/* =========================================================
   OFFICIAL ROOM CHAT

   These preserve the functions your existing
   SportCommunityPage already imports.
========================================================= */

export function subscribeToMessages(
  roomId: string,
  callback: (
    messages: RoomMessage[],
  ) => void,
) {
  const messagesRef =
    ref(
      database,
      `${officialRoomPath(
        roomId,
      )}/messages`,
    )

  return onValue(
    messagesRef,
    (snapshot) => {
      const value =
        snapshot.val() ?? {}

      const messages =
        Object.entries(value)
          .map(
            ([
              id,
              raw,
            ]) => {
              const item =
                raw as {
                  name?: string
                  text?: string
                  uid?: string
                  createdAt?: number
                }

              return {
                id,

                name:
                  item.name ??
                  'Guest',

                text:
                  item.text ??
                  '',

                uid:
                  item.uid,

                createdAt:
                  item.createdAt ??
                  0,
              }
            },
          )
          .sort(
            (a, b) =>
              a.createdAt -
              b.createdAt,
          )

      callback(
        messages,
      )
    },
  )
}

export async function sendRoomMessage(
  roomId: string,
  name: string,
  text: string,
  uid?: string,
) {
  const trimmed =
    text.trim()

  if (!trimmed) {
    return
  }

  const messagesRef =
    ref(
      database,
      `${officialRoomPath(
        roomId,
      )}/messages`,
    )

  const newMessage =
    push(
      messagesRef,
    )

  await set(
    newMessage,
    {
      name:
        name.trim() ||
        'Guest',

      text:
        trimmed,

      uid:
        uid ?? null,

      createdAt:
        Date.now(),
    },
  )
}

/* =========================================================
   OFFICIAL ROOM REACTIONS
========================================================= */

export function subscribeToReactions(
  roomId: string,
  callback: (
    reactions: RoomReactions,
  ) => void,
) {
  const reactionsRef =
    ref(
      database,
      `${officialRoomPath(
        roomId,
      )}/reactions`,
    )

  return onValue(
    reactionsRef,
    (snapshot) => {
      const value =
        snapshot.val() ?? {}

      callback({
        heart:
          Number(
            value.heart ??
              0,
          ),

        fire:
          Number(
            value.fire ??
              0,
          ),

        laugh:
          Number(
            value.laugh ??
              0,
          ),

        wow:
          Number(
            value.wow ??
              0,
          ),
      })
    },
  )
}

export async function addReaction(
  roomId: string,
  reaction:
    | 'heart'
    | 'fire'
    | 'laugh'
    | 'wow',
) {
  const reactionRef =
    ref(
      database,
      `${officialRoomPath(
        roomId,
      )}/reactions/${reaction}`,
    )

  await runTransaction(
    reactionRef,
    (value) =>
      Number(
        value ?? 0,
      ) + 1,
  )
}

/* =========================================================
   OFFICIAL ROOM VIEWERS
========================================================= */

export async function joinRoom(
  roomId: string,
) {
  const viewerRef =
    ref(
      database,
      `${officialRoomPath(
        roomId,
      )}/viewers/${viewerSessionId}`,
    )

  await set(
    viewerRef,
    {
      joinedAt:
        serverTimestamp(),
    },
  )

  await onDisconnect(
    viewerRef,
  ).remove()
}

export async function leaveRoom(
  roomId: string,
) {
  const viewerRef =
    ref(
      database,
      `${officialRoomPath(
        roomId,
      )}/viewers/${viewerSessionId}`,
    )

  await remove(
    viewerRef,
  )
}

export function subscribeToViewerCount(
  roomId: string,
  callback: (
    count: number,
  ) => void,
) {
  const viewersRef =
    ref(
      database,
      `${officialRoomPath(
        roomId,
      )}/viewers`,
    )

  return onValue(
    viewersRef,
    (snapshot) => {
      callback(
        snapshot.exists()
          ? snapshot.size
          : 0,
      )
    },
  )
}

/* =========================================================
   CREATE COMMUNITY ROOM
========================================================= */

export async function createCommunityRoom(
  input: CreateCommunityRoomInput,
): Promise<string> {
  const name =
    input.name.trim()

  const description =
    input.description.trim()

  if (!name) {
    throw new Error(
      'Room name is required.',
    )
  }

  if (
    name.length > 60
  ) {
    throw new Error(
      'Room name must be 60 characters or less.',
    )
  }

  if (
    description.length >
    200
  ) {
    throw new Error(
      'Description must be 200 characters or less.',
    )
  }

  const maxMembers =
    Math.min(
      Math.max(
        Number(
          input.maxMembers,
        ) || 50,
        2,
      ),
      500,
    )

  const roomsRef =
    ref(
      database,
      'communityRooms',
    )

  const newRoomRef =
    push(
      roomsRef,
    )

  if (!newRoomRef.key) {
    throw new Error(
      'Could not create room.',
    )
  }

  const room: Omit<
    CommunityRoom,
    'id'
  > = {
    matchId:
      input.matchId,

    sport:
      input.sport,

    name,

    description,

    ownerId:
      input.ownerId,

    ownerName:
      input.ownerName,

    maxMembers,

    createdAt:
      Date.now(),

    type:
      'community',
  }

  await set(
    newRoomRef,
    room,
  )

  return newRoomRef.key
}

/* =========================================================
   LIST COMMUNITY ROOMS FOR A MATCH
========================================================= */

export function subscribeToCommunityRooms(
  matchId: string,
  callback: (
    rooms: CommunityRoom[],
  ) => void,
) {
  const roomsRef =
    ref(
      database,
      'communityRooms',
    )

  return onValue(
    roomsRef,
    (snapshot) => {
      if (
        !snapshot.exists()
      ) {
        callback([])
        return
      }

      const value =
        snapshot.val() as Record<
          string,
          Omit<
            CommunityRoom,
            'id'
          >
        >

      const rooms =
        Object.entries(
          value,
        )
          .map(
            ([
              id,
              room,
            ]) => ({
              id,
              ...room,
            }),
          )
          .filter(
            (room) =>
              room.matchId ===
              matchId,
          )
          .sort(
            (a, b) =>
              b.createdAt -
              a.createdAt,
          )

      callback(
        rooms,
      )
    },
  )
}

/* =========================================================
   GET ONE COMMUNITY ROOM
========================================================= */

export async function getCommunityRoom(
  roomId: string,
): Promise<
  CommunityRoom | null
> {
  const roomRef =
    ref(
      database,
      communityRoomPath(
        roomId,
      ),
    )

  const snapshot =
    await get(
      roomRef,
    )

  if (
    !snapshot.exists()
  ) {
    return null
  }

  return {
    id:
      roomId,

    ...(snapshot.val() as Omit<
      CommunityRoom,
      'id'
    >),
  }
}

/* =========================================================
   DELETE COMMUNITY ROOM

   Only call this after checking current user
   is the owner in the UI.
========================================================= */

export async function deleteCommunityRoom(
  roomId: string,
) {
  await remove(
    ref(
      database,
      communityRoomPath(
        roomId,
      ),
    ),
  )
}

/* =========================================================
   COMMUNITY ROOM VIEWERS
========================================================= */

export async function joinCommunityRoom(
  roomId: string,
  maxMembers: number,
  userId?: string,
) {
  const viewersPath =
    `${communityRoomPath(
      roomId,
    )}/viewers`

  const viewersRef =
    ref(
      database,
      viewersPath,
    )

  const current =
    await get(
      viewersRef,
    )

  const count =
    current.exists()
      ? current.size
      : 0

  if (
    count >= maxMembers
  ) {
    throw new Error(
      'This room is full.',
    )
  }

  const viewerRef =
    ref(
      database,
      `${viewersPath}/${viewerSessionId}`,
    )

  await set(
    viewerRef,
    {
      uid:
        userId ??
        null,

      joinedAt:
        serverTimestamp(),
    },
  )

  await onDisconnect(
    viewerRef,
  ).remove()
}

export async function leaveCommunityRoom(
  roomId: string,
) {
  await remove(
    ref(
      database,
      `${communityRoomPath(
        roomId,
      )}/viewers/${viewerSessionId}`,
    ),
  )
}

export function subscribeToCommunityViewerCount(
  roomId: string,
  callback: (
    count: number,
  ) => void,
) {
  return onValue(
    ref(
      database,
      `${communityRoomPath(
        roomId,
      )}/viewers`,
    ),

    (snapshot) => {
      callback(
        snapshot.exists()
          ? snapshot.size
          : 0,
      )
    },
  )
}

/* =========================================================
   COMMUNITY ROOM CHAT
========================================================= */

export function subscribeToCommunityMessages(
  roomId: string,
  callback: (
    messages: RoomMessage[],
  ) => void,
) {
  return onValue(
    ref(
      database,
      `${communityRoomPath(
        roomId,
      )}/messages`,
    ),

    (snapshot) => {
      const value =
        snapshot.val() ?? {}

      const messages =
        Object.entries(value)
          .map(
            ([
              id,
              raw,
            ]) => {
              const item =
                raw as {
                  name?: string
                  text?: string
                  uid?: string
                  createdAt?: number
                }

              return {
                id,

                name:
                  item.name ??
                  'Guest',

                text:
                  item.text ??
                  '',

                uid:
                  item.uid,

                createdAt:
                  item.createdAt ??
                  0,
              }
            },
          )
          .sort(
            (a, b) =>
              a.createdAt -
              b.createdAt,
          )

      callback(
        messages,
      )
    },
  )
}

export async function sendCommunityMessage(
  roomId: string,
  name: string,
  text: string,
  uid?: string,
) {
  const trimmed =
    text.trim()

  if (!trimmed) {
    return
  }

  const messageRef =
    push(
      ref(
        database,
        `${communityRoomPath(
          roomId,
        )}/messages`,
      ),
    )

  await set(
    messageRef,
    {
      name:
        name.trim() ||
        'Guest',

      text:
        trimmed,

      uid:
        uid ??
        null,

      createdAt:
        Date.now(),
    },
  )
}

/* =========================================================
   COMMUNITY ROOM REACTIONS
========================================================= */

export function subscribeToCommunityReactions(
  roomId: string,
  callback: (
    reactions: RoomReactions,
  ) => void,
) {
  return onValue(
    ref(
      database,
      `${communityRoomPath(
        roomId,
      )}/reactions`,
    ),

    (snapshot) => {
      const value =
        snapshot.val() ?? {}

      callback({
        heart:
          Number(
            value.heart ??
              0,
          ),

        fire:
          Number(
            value.fire ??
              0,
          ),

        laugh:
          Number(
            value.laugh ??
              0,
          ),

        wow:
          Number(
            value.wow ??
              0,
          ),
      })
    },
  )
}

export async function addCommunityReaction(
  roomId: string,
  reaction:
    | 'heart'
    | 'fire'
    | 'laugh'
    | 'wow',
) {
  await update(
    ref(
      database,
      `${communityRoomPath(
        roomId,
      )}/reactions`,
    ),
    {
      [reaction]:
        increment(1),
    },
  )
}