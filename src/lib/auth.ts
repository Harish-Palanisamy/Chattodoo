import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'

import { auth } from './firebase'

/* =========================================
   SIGN UP
   ========================================= */

export async function signUp(
  username: string,
  email: string,
  password: string,
) {
  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    )

  await updateProfile(
    userCredential.user,
    {
      displayName: username,
    },
  )

  return userCredential.user
}

/* =========================================
   LOGIN
   ========================================= */

export async function login(
  email: string,
  password: string,
) {
  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password,
    )

  return userCredential.user
}

/* =========================================
   LOGOUT
   ========================================= */

export async function logout() {
  await signOut(auth)
}