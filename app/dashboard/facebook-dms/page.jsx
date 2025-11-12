"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";

export default function PageDMs() {
  const { data: session, status } = useSession();
  const [fbPage, setFbPage] = useState(null);
  const [igBusinessId, setIgBusinessId] = useState(null);
  const [fbConversations, setFbConversations] = useState([]);
  const [igConversations, setIgConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [dmReply, setDmReply] = useState("");
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const accessToken = session?.accessToken;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch Facebook Page & Instagram Business account
  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;

    const fetchAccounts = async () => {
      try {
        console.log("Fetching Facebook Pages...");
        const res = await axios.get("https://graph.facebook.com/v21.0/me/accounts", {
          params: { access_token: accessToken },
        });
        console.log("Pages data:", res.data);

        if (!res.data.data?.length) throw new Error("No Facebook Page found.");
        const page = res.data.data[0];
        console.log("Selected FB Page:", page);
        setFbPage(page);

        console.log("Fetching linked Instagram Business Account...");
        const igRes = await axios.get(`https://graph.facebook.com/v21.0/${page.id}`, {
          params: { fields: "instagram_business_account", access_token: page.access_token },
        });
        console.log("IG Business data:", igRes.data);

        if (!igRes.data.instagram_business_account)
          throw new Error("No linked Instagram Business Account.");
        setIgBusinessId(igRes.data.instagram_business_account.id);
      } catch (err) {
        console.error("Error fetching accounts:", err.response?.data || err);
        setError("Failed to fetch Facebook Page or Instagram Business Account.");
      }
    };

    fetchAccounts();
  }, [accessToken, status]);

  // Fetch conversations
  const fetchFBConversations = async () => {
    if (!fbPage) return;
    try {
      console.log("Fetching Facebook Page conversations...");
      const res = await axios.get(`https://graph.facebook.com/v21.0/${fbPage.id}/conversations`, {
        params: {
          access_token: fbPage.access_token,
          fields: "id,senders{name},snippet,updated_time",
        },
      });
      console.log("FB Conversations:", res.data);
      setFbConversations(res.data.data || []);
    } catch (err) {
      console.error("Error fetching FB conversations:", err.response?.data || err);
      setError("Failed to fetch Facebook conversations. Make sure your Page token is valid.");
    }
  };

  const fetchIGConversations = async () => {
    if (!igBusinessId || !fbPage) return;
    try {
      console.log("Fetching Instagram conversations...");
      const res = await axios.get(`https://graph.facebook.com/v21.0/${igBusinessId}/conversations`, {
        params: {
          access_token: fbPage.access_token,
          fields: "id,participants{username},snippet,updated_time",
        },
      });
      console.log("IG Conversations:", res.data);
      setIgConversations(res.data.data || []);
    } catch (err) {
      console.error("Error fetching IG conversations:", err.response?.data || err);
      setError("Failed to fetch Instagram conversations. Ensure proper permissions.");
    }
  };

  // Fetch messages
  const fetchMessages = async (conversationId) => {
    if (!fbPage) return;
    try {
      console.log(`Fetching messages for conversation ${conversationId}...`);
      const res = await axios.get(`https://graph.facebook.com/v21.0/${conversationId}/messages`, {
        params: {
          access_token: fbPage.access_token,
          fields: "id,message,from{name,id},to{name,id},created_time",
        },
      });
      console.log("Messages data:", res.data);
      setMessages(res.data.data || []);
      setSelectedConversation(conversationId);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Error fetching messages:", err.response?.data || err);
      setError("Failed to fetch messages.");
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!dmReply.trim()) return alert("Message cannot be empty");
    if (!selectedConversation || !fbPage) return;

    try {
        // Get recipient id (the user, not the page)
        const recipientId = messages.find(m => m.from.id !== fbPage.id)?.from.id;
        if (!recipientId) return alert("Cannot find recipient ID");

        console.log("Sending message to recipient:", recipientId, dmReply);

        await axios.post(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
                recipient: { id: recipientId },
                message: { text: dmReply }
            },
            {
                headers: { "Content-Type": "application/json" },
                params: { access_token: fbPage.access_token },
            }
        );

        console.log("Message sent successfully!");
        setDmReply("");
        fetchMessages(selectedConversation);
    } catch (err) {
        console.error("Error sending message:", err.response?.data || err);
        alert("Failed to send message. Make sure you use a Page token and recipient ID.");
    }
};


  if (status === "loading") return <p className="text-center mt-10">Loading session...</p>;
  if (!session)
    return (
      <p className="text-center mt-10">
        Please <a href="/" className="text-blue-600 underline">log in</a> first.
      </p>
    );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Page & Instagram DMs</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="flex space-x-4 mb-6">
          <button onClick={fetchFBConversations} className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700">Load Facebook DMs</button>
          <button onClick={fetchIGConversations} className="bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700">Load Instagram DMs</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conversations */}
          <div className="bg-white p-4 rounded-xl shadow space-y-4 max-h-[70vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-2">Conversations</h2>

            {fbConversations.length > 0 && (
              <div>
                <h3 className="font-semibold text-blue-600 mb-2">Facebook Page</h3>
                {fbConversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => fetchMessages(c.id)}
                    className={`cursor-pointer p-3 border rounded hover:bg-gray-50 ${selectedConversation === c.id ? "border-blue-500 bg-blue-50" : ""
                      }`}
                  >
                    <p className="font-semibold">{c.senders?.data[0]?.name || "Unknown"}</p>
                    <p className="text-gray-500 text-sm">{c.snippet || "No recent message"}</p>
                  </div>
                ))}
              </div>
            )}

            {igConversations.length > 0 && (
              <div>
                <h3 className="font-semibold text-purple-600 mb-2">Instagram</h3>
                {igConversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => fetchMessages(c.id)}
                    className={`cursor-pointer p-3 border rounded hover:bg-gray-50 ${selectedConversation === c.id ? "border-purple-500 bg-purple-50" : ""
                      }`}
                  >
                    <p className="font-semibold">{c.participants?.data[0]?.username || "Unknown"}</p>
                    <p className="text-gray-500 text-sm">{c.snippet || "No recent message"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          {selectedConversation && (
            <div className="bg-white p-4 rounded-xl shadow flex flex-col max-h-[70vh]">
              <h2 className="text-xl font-semibold mb-4">Messages</h2>
              <div className="flex-1 overflow-y-auto space-y-2">
                {messages.length === 0 ? (
                  <p className="text-gray-500">No messages in this conversation.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl max-w-[80%] break-words ${m.from?.id === fbPage?.id || m.from?.id === igBusinessId
                        ? "bg-blue-100 self-end text-right"
                        : "bg-gray-100 self-start"
                        }`}
                    >
                      <p className="text-sm">{m.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(m.created_time).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">From: {m.from?.name}</p>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex space-x-2 mt-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={dmReply}
                  onChange={(e) => setDmReply(e.target.value)}
                  className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage} className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700">Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
