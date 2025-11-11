export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = "GAAMOQ8i2B2JBZAFE2Q2NKZAW9XeUpnX19CVWxZAYUxWdTVDTnczblRfRk5wU2ROS0djT00zLTFrRWQtZA0RrZAF9QMjlNSi1jVV82NGY0YjJhWWY3cE44THNsd1ItSmdHbDlJZAi1aLUxZAeEQtVjFFd2FDM0xISWdOZA3lLa0R2cG5WNAZDZD"; // same token you set in Meta Dashboard

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    return new Response(challenge, { status: 200 });
  } else {
    return new Response("Forbidden", { status: 403 });
  }
}
