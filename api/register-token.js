// api/register-token.js
// POST endpoint: native app or WebView can call this to register a push token.
// Body: { token: string, platform: 'ios'|'android', userId?: string }
// Env vars needed: FIREBASE_API_KEY (your Firebase web API key)

const FIREBASE_PROJECT_ID = 'thedailyfive-f7103';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { token, platform, userId } = body;
  if (!token || typeof token !== 'string') {
    return new Response(JSON.stringify({ error: 'token required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Sanitise: Expo push tokens look like ExponentPushToken[xxxx]
  if (!token.startsWith('ExponentPushToken[')) {
    return new Response(JSON.stringify({ error: 'invalid token format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'server misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Use token as document ID (sanitised) to dedupe
  const docId = token.replace(/[^a-zA-Z0-9_-]/g, '_');
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/push-tokens/${docId}?key=${apiKey}`;

  const firestoreDoc = {
    fields: {
      token:     { stringValue: token },
      platform:  { stringValue: platform || 'unknown' },
      userId:    { stringValue: userId || '' },
      updatedAt: { integerValue: String(Date.now()) }
    }
  };

  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(firestoreDoc)
  });

  if (!r.ok) {
    const errText = await r.text();
    console.error('Firestore write failed:', errText);
    return new Response(JSON.stringify({ error: 'failed to save token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
