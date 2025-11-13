"use client";

import { useState, useRef } from "react";
import axios from "axios";

export default function InstagramDMs() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [dmReply, setDmReply] = useState("");
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // ✅ Use your working token
  const accessToken =
    "IGAAMOQ8i2B2JBZAFRJMjJWaTVNd1N6RnpFVHJVS19uRTc2Rl9DLXJJVk1hRXVUbVZAINFNUVTBWbm5xRHZAISnZAxRHhid09aU2RJX3RRbURiOEd3TTVmY3N0eW1rcE1wbmROMVFtTEVNaDlqWmFadkpaam5oWVNGcmpleXVkSnd0UQZDZD";

  const BASE_URL = "https://graph.instagram.com/v24.0";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✅ Fetch conversations from Instagram Graph API
  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/me/conversations`, {
        params: { access_token: accessToken, platform: "instagram" },
      });
      setConversations(res.data.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching conversations:", err.response?.data || err);
      setError(err.response?.data?.error?.message || "Failed to fetch conversations.");
    }
  };

  // ✅ Fetch messages in selected conversation
  const fetchMessages = async (conversationId) => {
    try {
      const res = await axios.get(`${BASE_URL}/${conversationId}`, {
        params: { fields: "messages", access_token: accessToken },
      });
      setMessages(res.data.messages?.data || []);
      setSelectedConversation(conversationId);
      setTimeout(scrollToBottom, 100);
      setError(null);
    } catch (err) {
      console.error("Error fetching messages:", err.response?.data || err);
      setError(err.response?.data?.error?.message || "Failed to fetch messages.");
    }
  };

  // ✅ Send DM reply (requires comment_id if replying to a comment)
  const sendMessage = async () => {
    if (!dmReply.trim()) return alert("Message cannot be empty");
    if (!selectedConversation) return alert("Select a conversation first");

    try {
      await axios.post(
        `${BASE_URL}/${selectedConversation}/messages`,
        {
          message: { text: dmReply },
        },
        {
          headers: { "Content-Type": "application/json" },
          params: { access_token: accessToken },
        }
      );

      setDmReply("");
      fetchMessages(selectedConversation); // refresh
      setError(null);
    } catch (err) {
      console.error("Error sending message:", err.response?.data || err);
      setError(err.response?.data?.error?.message || "Failed to send message.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Instagram DMs (Direct via Graph API)</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          onClick={fetchConversations}
          className="mb-6 bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700"
        >
          Load Conversations
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conversations */}
          <div className="bg-white p-4 rounded-xl shadow space-y-2 max-h-[70vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-3">Conversations</h2>
            {conversations.length === 0 ? (
              <p className="text-gray-500">No conversations found.</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => fetchMessages(conv.id)}
                  className={`cursor-pointer p-3 border rounded hover:bg-gray-50 ${
                    selectedConversation === conv.id ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <p className="font-semibold">Conversation ID:</p>
                  <p className="text-sm break-all text-gray-600">{conv.id}</p>
                  <p className="text-xs text-gray-400">
                    Updated: {new Date(conv.updated_time).toLocaleString()}
                  </p>
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
                  <p className="text-gray-500">No messages yet.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl max-w-[80%] break-words ${
                        msg.is_unsupported ? "bg-gray-200 text-gray-500" : "bg-blue-100"
                      }`}
                    >
                      <p className="text-sm">{msg.message || "Media or unsupported content"}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.created_time).toLocaleString()}
                      </p>
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
