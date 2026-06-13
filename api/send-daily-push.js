// api/send-daily-push.js
// Vercel cron: runs daily at 08:00 UTC (see vercel.json)
// Reads all push tokens from Firestore, sends via Expo Push API.
//
// Env vars needed:
//   FIREBASE_API_KEY  -- your Firebase web API key (from Firebase Console)
//   CRON_SECRET       -- any random string; set same value in Vercel + vercel.json header
//
// Firestore security rules: push-tokens must allow server reads.
// Add to your rules (Firebase Console > Firestore > Rules):
//   match /push-tokens/{id} {
//     allow read: if true;
//     allow write: if true;
//   }

const FIREBASE_PROJECT_ID = 'thedailyfive-f7103';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Verify this is a legitimate cron call
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'FIREBASE_API_KEY not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // --- Read all push tokens from Firestore ---
  let tokens = [];
  let pageToken = null;

  do {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/push-tokens?key=${apiKey}&pageSize=300` +
      (pageToken ? `&pageToken=${pageToken}` : '');

    const r = await fetch(url);
    if (!r.ok) {
      console.error('Firestore read failed:', await r.text());
      break;
    }
    const data = await r.json();
    for (const doc of (data.documents || [])) {
      const token = doc.fields?.token?.stringValue;
      if (token && token.startsWith('ExponentPushToken[')) {
        tokens.push(token);
      }
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'no tokens' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // --- Build notification messages ---
  const messages = tokens.map(token => ({
    to: token,
    title: 'The Daily Five',
    body: "Today's puzzle is live! Can you solve it in 5 tries?",
    sound: 'default',
    data: { url: 'https://www.thedailyfive.net/play.html' },
    channelId: 'default'
  }));

  // Expo Push API accepts max 100 messages per request
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  let totalSent = 0;
  let errors = 0;

  for (const chunk of chunks) {
    try {
      const pushRes = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(chunk)
      });
      if (pushRes.ok) {
        totalSent += chunk.length;
      } else {
        errors += chunk.length;
        console.error('Expo push error:', await pushRes.text());
      }
    } catch (e) {
      errors += chunk.length;
      console.error('Expo push exception:', e);
    }
  }

  return new Response(JSON.stringify({ sent: totalSent, errors, total: tokens.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
