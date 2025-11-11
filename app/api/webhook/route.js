export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = "IGAAMOQ8i2B2JBZAFFBV0RGRUxIdFptUmhLeng0ZAmRfS1BPcUdQQWVGOUlyNWM0TDM0UWdZAM0NxYXpCZA1JGUXlPaGljblNwUzhYZA0lORXU1UlR4RXZAuVC1CTS1RZAWsyUEFVU2MySmtnc3dYRVEwcW9mWFhlSW9RQ0poLW8ydmV4WQZDZD"; // same token you set in Meta Dashboard

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return new Response(challenge, { status: 200 });
  } else {
    return new Response("Forbidden", { status: 403 });
  }
}
