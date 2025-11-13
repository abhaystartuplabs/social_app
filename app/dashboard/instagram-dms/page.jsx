'use client'
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Send, MessageSquare, Loader2, XCircle } from 'lucide-react';

// --- MOCK IMPLEMENTATION TO RESOLVE COMPILATION ERROR ---
// The original code relied on 'next-auth/react', which is unavailable in this environment.
// This mock simulates an authenticated user session to allow the application to run.
// !!! IMPORTANT !!! Replace "YOUR_DUMMY_FB_ACCESS_TOKEN_HERE" with a valid
// Facebook Page Access Token that has 'instagram_basic' and 'instagram_manage_messages' scopes.
const useSession = () => {
  const DUMMY_ACCESS_TOKEN = "EAA7jKjObEpUBP2scmysg8cIZB40cObGUDJOeRKnnKZBbN8aHT54ocaYn8dVTGmlpdu5gyOJHPYlq3cLTCaMUa75ZBfqMwHRJ8GVZCOnMAI6qZBddwPXPJbr5RkbXyXHftsmTLTTlDZABHZBBhZAnZCy12l8xaRBPpZCdEgiTDLoaUzN12B3kKCJStFn3qMYhZBxymQYWvIdPgRkHbwOkUAgs52SNjlaH3KRSVlykWwBZAlOaQBT5okzaC2m1ebS6oZCVsryKQW01CdQZDZD"; 
  
  return {
    data: {
      user: { name: "Mock User" },
      accessToken: DUMMY_ACCESS_TOKEN,
    },
    status: DUMMY_ACCESS_TOKEN === "EAA7jKjObEpUBP2scmysg8cIZB40cObGUDJOeRKnnKZBbN8aHT54ocaYn8dVTGmlpdu5gyOJHPYlq3cLTCaMUa75ZBfqMwHRJ8GVZCOnMAI6qZBddwPXPJbr5RkbXyXHftsmTLTTlDZABHZBBhZAnZCy12l8xaRBPpZCdEgiTDLoaUzN12B3kKCJStFn3qMYhZBxymQYWvIdPgRkHbwOkUAgs52SNjlaH3KRSVlykWwBZAlOaQBT5okzaC2m1ebS6oZCVsryKQW01CdQZDZD" ? "unauthenticated" : "authenticated",
  };
};
// --- END MOCK IMPLEMENTATION ---


// Main App component as required for single-file React output
export default function App() {
  const { data: session, status } = useSession();
  const [instagramBusinessId, setInstagramBusinessId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [dmReply, setDmReply] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Derive access token for convenience
  const accessToken = session?.accessToken;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Core API Functions ---

  // 1. Fetch connected Instagram Business Account ID
  useEffect(() => {
    const getIGBusinessId = async () => {
      if (!accessToken || status !== 'authenticated') return;
      setIsLoading(true);
      setError(null);
      try {
        // Step 1: Get the list of connected Facebook Pages
        const pageRes = await axios.get(
          `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
        );
        const page = pageRes.data.data?.[0]; // Assuming the first Page is the correct one

        if (!page) {
          setError("No Facebook Page linked to this account. Ensure your access token has 'pages_show_list' permission.");
          setInstagramBusinessId(null);
          return;
        }

        // Step 2: Get the Instagram Business Account ID associated with the Page
        const igRes = await axios.get(
          `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
        );

        const igId = igRes.data.instagram_business_account?.id;
        
        if (igId) {
          setInstagramBusinessId(igId);
          console.log("✅ Instagram Business ID:", igId);
        } else {
          setError("No Instagram Business Account found for the linked Facebook Page. Ensure the Page is connected to an IG Business Profile.");
          setInstagramBusinessId(null);
        }
      } catch (err) {
        console.error("❌ Error fetching IG Business Account:", err.response?.data || err);
        setError(err.response?.data?.error?.message || "Failed to fetch Instagram Business Account details.");
      } finally {
        setIsLoading(false);
      }
    };

    getIGBusinessId();
  }, [accessToken, status]);


  // 2. Fetch DM conversations
  const fetchConversations = async () => {
    if (!instagramBusinessId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `https://graph.facebook.com/v21.0/${instagramBusinessId}/conversations`,
        {
          params: { 
            access_token: accessToken, 
            // Requesting required fields
            fields: "id,participants,snippet,updated_time" 
          },
        }
      );
      // Sort conversations by updated time (newest first)
      const sortedConversations = res.data.data.sort((a, b) => 
        new Date(b.updated_time).getTime() - new Date(a.updated_time).getTime()
      )
      setConversations(sortedConversations || []);
    } catch (err) {
      console.error("❌ Error fetching conversations:", err.response?.data || err);
      setError(err.response?.data?.error?.message || "Failed to fetch conversations.");
      setConversations([]);
    } finally {
        setIsLoading(false);
    }
  };

  // Auto-fetch conversations once ID is ready
  useEffect(() => {
    if (instagramBusinessId) {
      fetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instagramBusinessId]);


  // 3. Fetch messages in a conversation
  const fetchMessages = async (conversationId) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `https://graph.facebook.com/v21.0/${conversationId}/messages`,
        {
          params: { access_token: accessToken, fields: "id,text,from,timestamp" },
        }
      );
      // Messages are returned newest first by default, reverse to show chronologically
      const sortedMessages = res.data.data.slice().reverse(); 
      
      setMessages(sortedMessages || []);
      setSelectedConversation(conversationId);
      
      // Delay scrolling slightly to allow rendering
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error("❌ Error fetching messages:", err.response?.data || err);
      setError(err.response?.data?.error?.message || "Failed to fetch messages.");
      setMessages([]);
    } finally {
        setIsLoading(false);
    }
  };

  // 4. Send a reply
  const sendMessage = async () => {
    if (!dmReply.trim()) {
        setError("Message cannot be empty.");
        return;
    }
    
    // Prevent double-sending
    const tempReply = dmReply;
    setDmReply("");
    setError(null);

    try {
      // API call to send the message
      await axios.post(
        `https://graph.facebook.com/v21.0/${selectedConversation}/messages`,
        null,
        { 
          params: { 
            recipient: JSON.stringify({id: selectedConversation}),
            message: tempReply, 
            access_token: accessToken 
          } 
        }
      );

      // After sending, refetch messages to update the chat window
      fetchMessages(selectedConversation); 
    } catch (err) {
      console.error("❌ Error sending message:", err.response?.data || err);
      setError(err.response?.data?.error?.message || "Failed to send message."); 
      setDmReply(tempReply); // Restore message if sending failed
    }
  };

  // --- UI Render Logic ---

  if (status === "unauthenticated" || (status === "authenticated" && accessToken === "YOUR_DUMMY_FB_ACCESS_TOKEN_HERE")) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-center p-6 bg-white rounded-xl shadow-lg">
          Please provide a valid **Facebook Page Access Token** inside the `useSession` mock implementation to connect your Instagram account.
        </p>
      </div>
    );
  }
  
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 mr-2" />
        <p className="text-xl text-gray-700">Loading session and authenticating...</p>
      </div>
    );
  }

  const selectedParticipant = conversations.find(c => c.id === selectedConversation)?.participants?.data.find(p => p.id !== instagramBusinessId)?.username || "Selected Chat";

  return (
    <main className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 text-gray-800 flex items-center">
          <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
          Instagram DM Inbox
        </h1>

        {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 flex items-center">
                <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="block sm:inline font-medium">Error:</span>
                <p className="ml-2 text-sm">{error}</p>
            </div>
        )}

        {instagramBusinessId && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-6 text-sm">
                <span className="font-medium">Connected Instagram Business ID:</span> {instagramBusinessId}
            </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
            <div className="flex justify-center items-center my-4">
                <Loader2 className="animate-spin text-blue-600 mr-2" />
                <p className="text-gray-600">Loading data...</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="bg-white p-6 rounded-2xl shadow-xl lg:col-span-1 h-[70vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4 text-gray-700 border-b pb-2">Conversations ({conversations.length})</h2>
            
            {!instagramBusinessId && !isLoading && status === 'authenticated' && (
                <p className="text-gray-500 italic mt-4">Waiting for Instagram Business ID to load...</p>
            )}

            <div className="flex-1 overflow-y-auto space-y-3">
            {conversations.length === 0 && instagramBusinessId && !isLoading ? (
              <p className="text-gray-500 pt-2">No conversations found.</p>
            ) : (
              conversations.map((c) => {
                const participantUsername = c.participants?.data.find(p => p.id !== instagramBusinessId)?.username || "Unknown User";
                return (
                    <div
                        key={c.id}
                        onClick={() => fetchMessages(c.id)}
                        className={`cursor-pointer p-4 border border-gray-200 rounded-xl transition duration-200 ${selectedConversation === c.id ? "border-blue-500 bg-blue-50 shadow-md" : "hover:bg-gray-50"}`}
                    >
                        <p className="font-semibold text-gray-800 flex justify-between items-center">
                            <span>{participantUsername}</span>
                            <span className="text-xs font-normal text-blue-500">DM</span>
                        </p>
                        <p className="text-gray-500 text-sm mt-1 truncate">{c.snippet || "No recent message"}</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {c.updated_time ? new Date(c.updated_time).toLocaleTimeString() : ''}
                        </p>
                    </div>
                );
              })
            )}
            </div>
          </div>

          {/* Messages Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-xl lg:col-span-2 h-[70vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4 text-gray-700 border-b pb-2">
                {selectedConversation ? `Chat with @${selectedParticipant}` : "Select a Conversation"}
            </h2>

            {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
                    <MessageSquare className="w-6 h-6 mr-2" />
                    Click a conversation to view messages.
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {messages.length === 0 ? (
                            <p className="text-gray-500 pt-2">No messages in this conversation.</p>
                        ) : (
                            messages.map((m) => {
                                const isOutgoing = m.from?.id === instagramBusinessId;
                                return (
                                    <div
                                        key={m.id}
                                        className={`flex ${isOutgoing ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`p-3 max-w-[75%] rounded-2xl break-words shadow-sm ${isOutgoing
                                                ? "bg-blue-600 text-white rounded-br-none"
                                                : "bg-gray-100 text-gray-800 rounded-tl-none"
                                            }`}
                                        >
                                            <p className="text-sm">{m.text}</p>
                                            <p className={`text-xs mt-1 ${isOutgoing ? 'text-blue-200' : 'text-gray-400'}`}>
                                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Reply Input */}
                    <div className="flex space-x-3 mt-4 pt-4 border-t">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={dmReply}
                            onChange={(e) => setDmReply(e.target.value)}
                            className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition duration-150"
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            className={`bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold flex items-center justify-center transition duration-200 hover:bg-blue-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={isLoading || !dmReply.trim()}
                        >
                            <Send className="w-5 h-5 mr-2" />
                            Send
                        </button>
                    </div>
                </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}