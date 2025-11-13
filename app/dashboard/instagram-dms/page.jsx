"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

// Using the Instagram Graph API base URL and version specified by the user.
const API_BASE = "https://graph.instagram.com/v24.0"; 
// Using the IGA... token provided by the user for immediate testing.
const DEFAULT_TOKEN = "IGAAMOQ8i2B2JBZAFRJMjJWaTVNd1N6RnpFVHJVS19uRTc2Rl9DLXJJVk1hRXVUbVZAINFNUVTBWbm5xRHZAISnZAxRHhid09aU2RJX3RRbURiOEd3TTVmY3N0eW1rcE1wbmROMVFtTEVNaDlqWmFadkpaam5oWVNGcmpleXVkSnd0UQZDZD"; 

// Custom utility updated to handle both GET (query params) and POST (form body)
const handleApiCall = async (endpoint, params = {}, method = 'GET', body = null) => {
  console.log(`%c[API Call] Starting ${method} request to endpoint: ${endpoint}`, 'color: #1e40af; font-weight: bold;');
  
  let fullUrl = `${API_BASE}/${endpoint}`;
  let options = { method };

  // 1. Handle GET query parameters
  if (method === 'GET' && Object.keys(params).length > 0) {
      const query = new URLSearchParams(params).toString();
      fullUrl = `${fullUrl}?${query}`;
  }
  
  // 2. Handle POST body data
  if (body && method === 'POST') {
      // Use URLSearchParams for form-urlencoded body (standard for Graph API POST)
      const formData = new URLSearchParams(body);
      options.body = formData.toString();
      options.headers = {
          'Content-Type': 'application/x-www-form-urlencoded',
      };
      console.log(`%c[API Call Step] POST Body prepared (Form Data): ${options.body}`, 'color: #3b82f6;');
  } else if (method !== 'POST' && Object.keys(params).length > 0) {
       // Append params to URL for non-POST methods 
       const query = new URLSearchParams(params).toString();
       fullUrl = `${fullUrl}?${query}`;
  }

  let response, data;
  let delay = 1000;
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
        console.log(`%c[API Call Step] Attempt ${i + 1} to URL: ${fullUrl}`, 'color: #60a5fa;');
        response = await fetch(fullUrl, options);
        data = await response.json();

        // Check for specific rate-limit/server errors that warrant a retry
        if (response.status === 429 || response.status >= 500) {
            if (i < maxRetries - 1) {
                console.warn(`%c[API Call Step] Rate limit or server error (${response.status}). Retrying in ${delay}ms...`, 'color: #f59e0b;');
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
                continue;
            }
        }

        if (!response.ok || data.error) {
          const errorMessage = data.error?.message || `HTTP error! Status: ${response.status}`;
          console.error("%c[API Call Step] API Error Response:", 'color: #ef4444; font-weight: bold;', data.error || data);
          throw new Error(errorMessage);
        }
        console.log("%c[API Call Step] Successful Response:", 'color: #10b981; font-weight: bold;', data);
        return data;
    } catch (error) {
        console.error(`%c[API Call Step] Fetch failed (attempt ${i + 1}):`, 'color: #ef4444;', error);
        if (i < maxRetries - 1 && error.message.includes("Network")) {
             await new Promise(resolve => setTimeout(resolve, delay));
             delay *= 2; 
             continue;
        }
        throw error;
    }
  }
};

export default function InstagramDMs() {
  const [userToken, setUserToken] = useState(DEFAULT_TOKEN);
  const [isTokenEntered, setIsTokenEntered] = useState(!!DEFAULT_TOKEN);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // New state for sending messages
  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const accessToken = userToken;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper to fetch details for a single message (API Call 3)
  const fetchMessageDetails = useCallback(async (messageId) => {
    console.log(`%c[API Call 3] Fetching details for message ID: ${messageId}`, 'color: #8b5cf6;');
    try {
        const details = await handleApiCall(
            messageId,
            { 
                access_token: accessToken,
                fields: "id,created_time,from,to,message,shares,attachments"
            }
        );
        // The API returns 'message' for text content, or fields like 'shares'/'attachments'
        const textContent = details.message || (
            details.shares ? "[Shared Content]" : 
            details.attachments ? "[Media Attachment]" : 
            "[Unsupported Content]"
        );

        return {
            ...details,
            text: textContent,
            // Determine if the message sender's ID matches the currently inferred user ID
            isSender: details.from?.id === currentUserId 
        };
    } catch (err) {
        console.error(`%c[API Call 3 Error] Failed to fetch details for message ${messageId}:`, 'color: #ef4444;', err);
        return { id: messageId, text: "[Error loading message details]" };
    }
  }, [accessToken, currentUserId]);


  // 2. Fetch messages in a specific conversation (Uses Call 2 & Call 3)
  const fetchMessages = useCallback(async (conversationId) => {
    setSelectedConversation(conversationId);
    setLoading(true);
    setError(null);
    setMessages([]);
    
    try {
        console.log(`%c[API Call 2] Fetching basic message list for conversation: ${conversationId}`, 'color: #c084fc;');
        // --- API Call 2: Get basic message list from conversation edge ---
        const msgListRes = await handleApiCall(
            `${conversationId}/messages`,
            { 
                access_token: accessToken, 
                fields: "id,created_time,is_unsupported,from,message",
                limit: 25 
            }
        );

        const basicMessages = msgListRes.data || [];
        
        // Infer the Current User ID from the first message's 'to' field if not set
        if (!currentUserId && basicMessages.length > 0) {
             console.log("%c[Logic] Inferring Current User ID from message recipient...", 'color: #10b981;');
             // We need to fetch details of at least one message to find the recipient (our ID)
             const firstMessageDetails = await fetchMessageDetails(basicMessages[0].id);
             const recipient = firstMessageDetails.to?.data?.[0];
             if(recipient) {
                 setCurrentUserId(recipient.id);
                 console.log(`%c[Logic] Current User ID set to: ${recipient.id}`, 'color: #10b981;');
             }
        }
        
        // --- API Call 3 Loop: Fetch full details for each message (Necessary for complete metadata) ---
        console.log(`%c[API Call 3 Loop] Starting detail fetch for ${basicMessages.length} messages.`, 'color: #8b5cf6;');
        const detailedMessagesPromises = basicMessages.map(m => fetchMessageDetails(m.id));
        const detailedMessages = await Promise.all(detailedMessagesPromises);
        
        const finalMessages = detailedMessages
            // Reverse to show messages in chronological order (oldest first)
            .reverse();

        setMessages(finalMessages);
        setTimeout(scrollToBottom, 100);

    } catch (err) {
        setError(err.message || "Failed to fetch messages.");
        setMessages([]);
    } finally {
        setLoading(false);
    }
  }, [accessToken, currentUserId, fetchMessageDetails]);


  // 1. Fetch DM conversations (API Call 1)
  const fetchConversations = useCallback(async () => {
    if (!accessToken) {
      setError("Please enter a valid Access Token.");
      return;
    }
    setLoading(true);
    setError(null);
    setConversations([]);
    setSelectedConversation(null);
    setMessages([]);

    try {
      console.log("%c[API Call 1] Fetching conversations list (me/conversations).", 'color: #3b82f6;');
      const data = await handleApiCall(
        `me/conversations`,
        { 
            access_token: accessToken,
            platform: "instagram",
            // The API requires 'participants' field to retrieve usernames/IDs
            fields: "id,participants,snippet,updated_time" 
        }
      );
      
      setConversations(data.data || []);

    } catch (err) {
      setError(err.message || "Failed to fetch conversations.");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);


  // 4. Send a message (New Functionality)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedConversation || !newMessageText.trim() || isSending) {
        setError("Cannot send: No conversation selected or message is empty.");
        return;
    }
    
    setIsSending(true);
    setError(null);
    const messageToSend = newMessageText.trim();
    
    try {
        console.log(`%c[API Call 4] Preparing to send message to conversation ID: ${selectedConversation}`, 'color: #f97316; font-weight: bold;');
        
        const payload = {
            access_token: accessToken,
            message: messageToSend,
        };
        
        // --- API Call 4: POST request to send message ---
        const sendRes = await handleApiCall(
            `${selectedConversation}/messages`,
            {}, // No query params needed, body holds everything
            'POST',
            payload // Data for the POST body
        );
        
        console.log("%c[API Call 4 Success] Message sent. Refreshing messages.", 'color: #10b981; font-weight: bold;', sendRes);

        // Clear input and optimistically refresh the chat window
        setNewMessageText("");
        // Refresh the messages to see the new message (triggers API Call 2 & 3)
        await fetchMessages(selectedConversation);

    } catch (err) {
        setError(err.message || "Failed to send message. Check console for details.");
    } finally {
        setIsSending(false);
    }
  };


  useEffect(() => {
    // Automatically fetch conversations if a token is present and submitted
    if (isTokenEntered && conversations.length === 0) {
      fetchConversations();
    }
  }, [isTokenEntered, fetchConversations, conversations.length]);


  const handleTokenSubmit = (e) => {
      e.preventDefault();
      // Reset state and flag that a token has been submitted
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      setCurrentUserId(null);
      setError(null);
      setIsTokenEntered(true);
      console.log("%c[Event] Access Token submitted. Starting fetchConversations (API Call 1).", 'color: #3b82f6;');
  };
  
  const isReady = isTokenEntered && conversations.length > 0;

  const getParticipantName = (conversation) => {
    // Find the participant that IS NOT the current user
    const otherParticipant = conversation.participants?.data.find(p => p.id !== currentUserId);
    return otherParticipant?.username || "Direct Message";
  };
  
  const ErrorBanner = ({ message }) => (
    <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg mb-4 shadow-sm" role="alert">
      <p className="font-bold">Error:</p>
      <p>{message}</p>
    </div>
  );

  const LoadingIndicator = () => (
    <div className="flex justify-center items-center py-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );


  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6 border-b pb-2">
          Instagram DM Viewer & Sender 🚀
        </h1>
        
        {/* Access Token Input */}
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6 border-t-4 border-gray-400">
            <form onSubmit={handleTokenSubmit}>
                <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram Access Token (IGA...)
                </label>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <input
                        id="accessToken"
                        type="password"
                        placeholder="Paste your IGA... token here"
                        value={userToken}
                        onChange={(e) => setUserToken(e.target.value)}
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-150"
                    />
                    <button
                        type="submit"
                        className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200"
                        disabled={loading || !userToken.trim()}
                    >
                        {loading ? 'Connecting...' : 'Connect & Fetch Conversations (API Call 1)'}
                    </button>
                </div>
            </form>
            {error && <ErrorBanner message={error} />}
        </div>
        
        {/* Status */}
        <div className="text-sm text-gray-600 mb-6 p-3 bg-white rounded-lg shadow-md">
            **Current User ID (Inferred):** <span className="font-mono text-blue-700 break-all">{currentUserId || 'N/A (Set after viewing first message)'}</span>
        </div>

        
        {/* Main Application Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-2xl space-y-2 max-h-[80vh] overflow-y-auto border-t-4 border-blue-600">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
                Conversations ({conversations.length})
            </h2>
            {loading && <LoadingIndicator />}
            {!isReady && !loading && isTokenEntered && conversations.length === 0 ? (
                <p className="text-gray-500 p-2">Fetching conversations using API Call 1...</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  // Clicking this triggers API Call 2 and Call 3
                  onClick={() => fetchMessages(c.id)}
                  className={`cursor-pointer p-4 border rounded-xl transition duration-150 hover:shadow-md ${
                    selectedConversation === c.id
                      ? "border-blue-500 bg-blue-100 shadow-inner"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-semibold text-gray-800 truncate">
                    {getParticipantName(c)}
                  </p>
                  <p className="text-gray-500 text-xs italic">
                    Updated: {c.updated_time ? new Date(c.updated_time).toLocaleString() : 'No time'}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Messages Panel */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-2xl flex flex-col max-h-[80vh] border-t-4 border-blue-600">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                {selectedConversation 
                    ? `Messages with ${getParticipantName(conversations.find(c => c.id === selectedConversation) || {})}`
                    : "Select a conversation"
                }
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-4">
                {loading && selectedConversation && <LoadingIndicator />}
                {!selectedConversation ? (
                    <p className="text-gray-500 text-center py-10">Select a conversation from the list to view its messages.</p>
                ) : (
                    !loading && messages.length === 0 ? (
                        <p className="text-gray-500 text-center py-10">No messages found or failed to load. (Used API Call 2 & 3)</p>
                    ) : (
                        messages.map((m) => (
                            <div
                                key={m.id}
                                className={`flex ${
                                    m.isSender ? "justify-end" : "justify-start"
                                }`}
                            >
                                <div
                                    className={`p-3 rounded-2xl max-w-[90%] sm:max-w-[70%] break-words shadow-md transition-all duration-300 ${
                                        m.isSender
                                            ? "bg-blue-600 text-white rounded-br-none"
                                            : "bg-gray-200 text-gray-800 rounded-tl-none"
                                    }`}
                                >
                                    <p className="text-xs font-semibold mb-1 opacity-75">
                                        {m.isSender ? `You (${m.from?.username || m.from?.id})` : `${m.from?.username || m.from?.id}`}
                                    </p>
                                    <p className="text-base leading-snug whitespace-pre-wrap">{m.text}</p>
                                    <p className={`text-xs mt-1 ${m.isSender ? "text-blue-200" : "text-gray-500"}`}>
                                        {new Date(m.created_time).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )
                )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input (New Functionality - API Call 4) */}
            {selectedConversation && (
                <form onSubmit={handleSendMessage} className="flex mt-4 pt-4 border-t border-gray-100">
                    <input
                        type="text"
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 p-3 border border-gray-300 rounded-l-xl focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-150"
                        disabled={isSending || loading}
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-3 rounded-r-xl font-semibold hover:bg-blue-700 transition duration-200 disabled:opacity-50 flex items-center justify-center"
                        disabled={isSending || loading || !newMessageText.trim()}
                    >
                        {isSending ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            'Send (API Call 4)'
                        )}
                    </button>
                </form>
            )}

          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #999; }
      `}</style>
    </main>
  );
}