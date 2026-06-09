const CH_HOST = process.env.CH_HOST;
const CH_PORT = process.env.CH_PORT || "8443";
const CH_USER = process.env.CH_USER;
const CH_PASSWORD = process.env.CH_PASSWORD;

export async function runQuery(sql) {
  const response = await fetch(`https://${CH_HOST}:${CH_PORT}/?default_format=JSON`, {
    method: "POST",
    headers: {
      "X-ClickHouse-User": CH_USER,
      "X-ClickHouse-Key": CH_PASSWORD,
      "Content-Type": "text/plain"
    },
    body: sql
  });
  if (!response.ok) throw new Error(await response.text());
  const result = await response.json();
  return result.data || result;
}

export function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json","Access-Control-Allow-Origin":"*" }
  });
}

export function errorResponse(error) {
  return new Response(JSON.stringify({error:error.message||String(error)}), {
    status:500,
    headers:{"Content-Type":"application/json"}
  });
}
