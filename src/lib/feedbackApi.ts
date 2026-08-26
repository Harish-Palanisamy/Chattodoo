import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore'

import {
  db,
} from './firebase'

export type FeedbackCategory =
  | 'bug'
  | 'feature'
  | 'sports-data'
  | 'general'

export type FeedbackInput = {
  category: FeedbackCategory
  message: string
  userId?: string
  userEmail?: string
}

const TIMEOUT_MS =
  10_000

function timeoutPromise() {
  return new Promise<never>(
    (_, reject) => {
      window.setTimeout(
        () => {
          reject(
            new Error(
              'Feedback request timed out. Check Firestore setup and connection.',
            ),
          )
        },
        TIMEOUT_MS,
      )
    },
  )
}

export async function submitFeedback(
  feedback: FeedbackInput,
) {
  const message =
    feedback.message.trim()

  if (!message) {
    throw new Error(
      'Please enter your feedback.',
    )
  }

  if (
    message.length < 5
  ) {
    throw new Error(
      'Please give us a little more detail.',
    )
  }

  if (
    message.length > 2000
  ) {
    throw new Error(
      'Feedback must be under 2000 characters.',
    )
  }

  console.log(
    'Submitting feedback to Firestore...',
  )

  try {
    const result =
      await Promise.race([
        addDoc(
          collection(
            db,
            'feedback',
          ),
          {
            category:
              feedback.category,

            message,

            userId:
              feedback.userId ??
              null,

            userEmail:
              feedback.userEmail ??
              null,

            status: 'new',

            createdAt:
              serverTimestamp(),
          },
        ),

        timeoutPromise(),
      ])

    console.log(
      'Feedback saved:',
      result.id,
    )

    return result
  } catch (error) {
    console.error(
      'Firestore feedback error:',
      error,
    )

    throw error
  }
}