import {
  initializeApp,
} from 'firebase/app'

import {
  getAuth,
} from 'firebase/auth'

import {
  getDatabase,
} from 'firebase/database'

import {
  getFirestore,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY,

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID,
}

const app =
  initializeApp(firebaseConfig)

/*
 * Firebase Authentication
 *
 * Used for:
 * login
 * signup
 * users
 */
export const auth =
  getAuth(app)

/*
 * Firebase Realtime Database
 *
 * KEEP THIS.
 *
 * Used by:
 * sports rooms
 * chat
 * reactions
 * viewer counts
 */
export const database =
  getDatabase(
    app,
    'https://chattodoo-default-rtdb.asia-southeast1.firebasedatabase.app',
  )

/*
 * Cloud Firestore
 *
 * Used by:
 * feedback
 */
export const db =
  getFirestore(app)

export {
  app,
}