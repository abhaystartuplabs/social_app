export const runtime = "edge"; // Optional, runs as Edge Function

// Instagram Webhook verification token
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

export async function GET(req) {
  // Handle verification challenge
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Instagram Webhook received:", JSON.stringify(body, null, 2));

    // TODO: Process the message here, e.g., respond or save to DB

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response("Error", { status: 500 });
  }
}
