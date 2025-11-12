"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";

export default function InstagramDMs() {
  const { data: session, status } = useSession();
  const [instagramBusinessId, setInstagramBusinessId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [dmReply, setDmReply] = useState("");
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const accessToken = session?.accessToken;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch connected Instagram Business account
  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;

    const fetchIGBusinessId = async () => {
      try {
        const pagesRes = await axios.get("https://graph.facebook.com/v21.0/me/accounts", {
          params: { access_token: accessToken },
        });

        const page = pagesRes.data.data?.[0];
        if (!page) throw new Error("No connected Facebook Page found.");

        const igRes = await axios.get(`https://graph.facebook.com/v21.0/${page.id}`, {
          params: { fields: "instagram_business_account", access_token: accessToken },
        });

        const igId = igRes.data.instagram_business_account?.id;
        if (!igId) throw new Error("No linked Instagram Business Account found.");

        setInstagramBusinessId(igId);
      } catch (err) {
        console.error("Error fetching IG business account:", err.response?.data || err);
        setError("Failed to fetch Instagram Business Account.");
      }
    };

    fetchIGBusinessId();
  }, [accessToken, status]);

  // Fetch DM conversations
  const fetchConversations = async () => {
    if (!instagramBusinessId) return;
    try {
      const res = await axios.get(
        `https://graph.facebook.com/v21.0/${instagramBusinessId}/conversations`,
        { params: { access_token: accessToken } }
      );
      setConversations(res.data.data || []);
    } catch (err) {
      console.error("Error fetching conversations:", err.response?.data || err);
      setError("Failed to fetch conversations.");
    }
  };

  // Fetch messages in a conversation
  const fetchMessages = async (conversationId) => {
    try {
      const res = await axios.get(
        `https://graph.facebook.com/v21.0/${conversationId}/messages`,
        { params: { access_token: accessToken } }
      );
      setMessages(res.data.data || []);
      setSelectedConversation(conversationId);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error("Error fetching messages:", err.response?.data || err);
      setError("Failed to fetch messages.");
    }
  };

  // Send a reply
  const sendMessage = async () => {
    if (!dmReply.trim()) return alert("Message cannot be empty");
    try {
      await axios.post(
        `https://graph.facebook.com/v21.0/${selectedConversation}/messages`,
        null,
        { params: { message: dmReply, access_token: accessToken } }
      );
      setDmReply("");
      fetchMessages(selectedConversation); // Refresh messages
    } catch (err) {
      console.error("Error sending message:", err.response?.data || err);
      alert("Failed to send message.");
    }
  };

  if (status === "loading") return <p className="text-center mt-10">Loading session...</p>;
  if (!session)
    return (
      <p className="text-center mt-10">
        Please{" "}
        <a href="/" className="text-blue-600 underline">
          log in
        </a>{" "}
        first.
      </p>
    );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Instagram DMs</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          onClick={fetchConversations}
          className="mb-6 bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Load Conversations
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conversations List */}
          <div className="bg-white p-4 rounded-xl shadow space-y-2 max-h-[70vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-3">Conversations</h2>
            {conversations.length === 0 ? (
              <p className="text-gray-500">No conversations found.</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => fetchMessages(c.id)}
                  className={`cursor-pointer p-3 border rounded hover:bg-gray-50 ${
                    selectedConversation === c.id ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <p className="font-semibold">{c.participants?.data[0]?.username || "Unknown"}</p>
                  <p className="text-gray-500 text-sm">{c.snippet || "No recent message"}</p>
                </div>
              ))
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
                      className={`p-3 rounded-xl max-w-[80%] break-words ${
                        m.from?.id === instagramBusinessId
                          ? "bg-blue-100 self-end text-right"
                          : "bg-gray-100 self-start"
                      }`}
                    >
                      <p className="text-sm">{m.text}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(m.timestamp).toLocaleString()}</p>
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
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
