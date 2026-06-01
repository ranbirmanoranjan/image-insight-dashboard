export const config = { runtime: 'edge' };

const METABASE_URL =
  'https://metabase.spyne.ai/public/question/c3814f87-326a-4754-a4f8-072175694f23.json';

export default async function handler(req) {
  try {
    const res = await fetch(METABASE_URL, {
      headers: { 'Content-Type': 'application/json' },
    });

    const raw = await res.text();

    return new Response(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
