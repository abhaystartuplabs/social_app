"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const [account, setAccount] = useState(null);
    const [media, setMedia] = useState([]);
    const [modalPost, setModalPost] = useState(null); // Track post for modal
    const [modalType, setModalType] = useState(null); // "comments" or "insights"
    const [comments, setComments] = useState([]);
    const [reply, setReply] = useState("");
    const [caption, setCaption] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [instagramBusinessId, setInstagramBusinessId] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState([]);
    const [replyText, setReplyText] = useState({});
    const [pageAccessToken, setPageAccessToken] = useState(null);
    const router = useRouter()

    const accessToken = session?.accessToken;
    console.log("pageAccessToken:-",pageAccessToken)
    console.log("replyText:-",replyText)

    const timeAgo = (timestamp) => {
        const diff = (new Date() - new Date(timestamp)) / 1000;
        if (diff < 60) return `${Math.floor(diff)}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    useEffect(() => {
        if (!session?.accessToken) return;

        const getPageAccessToken = async () => {
            try {
                const res = await axios.get(`https://graph.facebook.com/v21.0/me/accounts`, {
                    params: { access_token: session.accessToken },
                });

                if (res.data?.data?.length > 0) {
                    // Get first page's token (or add UI to select)
                    const page = res.data.data[0];
                    setPageAccessToken(page.access_token);
                    console.log("✅ Page Access Token:", page.access_token);
                } else {
                    console.error("⚠️ No connected pages found.");
                }
            } catch (err) {
                console.error("❌ Error getting page access token:", err.response?.data || err);
            }
        };

        getPageAccessToken();
    }, [session?.accessToken]);

    // Fetch connected Instagram Business account
    useEffect(() => {
        if (!accessToken || status !== "authenticated") return;

        const fetchAccount = async () => {
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
                console.error("Error fetching connected account:", err.response?.data || err);
                setError("Failed to fetch connected account. Check permissions.");
            }
        };
        fetchAccount();
    }, [accessToken, status]);

    // Fetch Instagram account info & media
    useEffect(() => {
        if (!instagramBusinessId || !accessToken) return;

        const fetchData = async () => {
            try {
                const [accountRes, mediaRes] = await Promise.all([
                    axios.get(`https://graph.facebook.com/v21.0/${instagramBusinessId}`, {
                        params: {
                            fields: "username,name,profile_picture_url,followers_count,follows_count,media_count",
                            access_token: accessToken,
                        },
                    }),
                    axios.get(`https://graph.facebook.com/v21.0/${instagramBusinessId}/media`, {
                        params: {
                            fields:
                                "id,caption,media_url,permalink,like_count,comments_count,media_type,thumbnail_url",
                            access_token: accessToken,
                        },
                    }),
                ]);
                setAccount(accountRes.data);
                setMedia(mediaRes.data.data || []);
            } catch (err) {
                console.error("Error fetching Instagram data:", err.response?.data || err);
                setError("Failed to fetch Instagram data.");
            }
        };

        fetchData();
    }, [instagramBusinessId, accessToken]);

    // Fetch comments including replies
    const fetchComments = async (postId) => {
        try {
            const res = await axios.get(`https://graph.facebook.com/v21.0/${postId}/comments`, {
                params: {
                    fields: "id,text,username,timestamp,replies{id,text,username,timestamp}",
                    access_token: accessToken,
                },
            });

            setComments(res.data.data || []);
            console.log("Comment of Post:-", res)
            console.log("Post Id:-", postId)
            setModalPost(postId);
            setModalType("comments");
        } catch (err) {
            console.error("Error fetching comments:", err.response?.data || err);
            setComments([]);
        }
    };

    // Fetch permissions and IG Business account
    useEffect(() => {
        if (!accessToken || status !== "authenticated") return;

        const fetchIGBusinessAndPermissions = async () => {
            try {
                // 1️⃣ Fetch user permissions
                const permRes = await axios.get(
                    `https://graph.facebook.com/v21.0/me/permissions`,
                    { params: { access_token: accessToken } }
                );
                setPermissions(permRes.data.data || []);

                // 2️⃣ Fetch connected Facebook Pages
                const pagesRes = await axios.get("https://graph.facebook.com/v21.0/me/accounts", {
                    params: { access_token: accessToken },
                });
                const page = pagesRes.data.data?.[0];
                if (!page) throw new Error("No connected Facebook Page found.");

                // 3️⃣ Get linked Instagram Business Account
                const igRes = await axios.get(`https://graph.facebook.com/v21.0/${page.id}`, {
                    params: { fields: "instagram_business_account", access_token: accessToken },
                });
                const igId = igRes.data.instagram_business_account?.id;
                if (!igId) throw new Error("No linked Instagram Business Account found.");

                setInstagramBusinessId(igId);
            } catch (err) {
                console.error("Error fetching IG business account or permissions:", err.response?.data || err);
                setError(err.response?.data?.error?.message || "Failed to fetch data.");
            }
        };

        fetchIGBusinessAndPermissions();
    }, [accessToken, status]);

    // Reply to comment
    const postReply = async (commentId, message, type = "public") => {
  if (!message?.trim()) {
    console.warn("⚠️ Empty message, skipping reply.");
    return alert("Please enter a reply.");
  }

  console.log("🟦 postReply Triggered:", {
    commentId,
    message,
    type,
    instagramBusinessId,
    accessToken: accessToken?.slice(0, 15) + "...",
    pageAccessToken: pageAccessToken?.slice(0, 15) + "...",
  });

  try {
    if (type === "public") {
      console.log("🌐 Sending PUBLIC reply:", {
        endpoint: `https://graph.facebook.com/v23.0/${commentId}/replies`,
        tokenUsed: "accessToken",
      });

      const res = await axios.post(
        `https://graph.facebook.com/v23.0/${commentId}/replies`,
        null,
        {
          params: {
            message,
            access_token: accessToken,
          },
        }
      );

      console.log("✅ Public reply response:", res.data);
      alert("✅ Public reply sent!");
    } else {
      console.log("📩 Sending PRIVATE reply:", {
        endpoint: `https://graph.facebook.com/v23.0/${instagramBusinessId}/messages`,
        tokenUsed: "pageAccessToken",
        recipient_comment_id: commentId,
      });

      const res = await axios.post(
        `https://graph.facebook.com/v23.0/${instagramBusinessId}/messages`,
        {
          recipient: { comment_id: commentId },
          message: { text: message },
        },
        {
          headers: { "Content-Type": "application/json" },
          params: { access_token: pageAccessToken },
        }
      );

      console.log("✅ Private reply response:", res.data);
      alert("✅ Private message sent!");
    }

    // Clear the reply input
    setReplyText((prev) => ({ ...prev, [commentId]: "" }));
    console.log("🧹 Cleared reply input for comment:", commentId);

    // Refresh comments
    fetchComments(modalPost);
  } catch (err) {
    console.error("❌ Reply Error Details:", {
      message: err.message,
      response: err.response?.data,
      stack: err.stack,
    });
    alert(`❌ Failed to send ${type} reply. Check permissions or API access.`);
  }
};

    // Fetch insights
    const fetchInsights = async (postId) => {
        try {
            const res = await axios.get(`https://graph.facebook.com/v21.0/${postId}/insights`, {
                params: {
                    metric: "reach,likes,comments,saved,shares,total_interactions",
                    access_token: accessToken,
                },
            });
            setInsights(res.data.data || []);
            setModalPost(postId);
            setModalType("insights");
        } catch (err) {
            console.error("Error fetching insights:", err.response?.data || err);
            alert(`❌ Failed to fetch insights: ${err.response?.data?.error?.message}`);
        }
    };

    // Create post
    const createPost = async () => {
        if (!imageUrl) return alert("Please enter an image URL");
        setLoading(true);
        try {
            const creationRes = await axios.post(
                `https://graph.facebook.com/v21.0/${instagramBusinessId}/media`,
                null,
                { params: { image_url: imageUrl, caption, access_token: accessToken } }
            );
            await axios.post(
                `https://graph.facebook.com/v21.0/${instagramBusinessId}/media_publish`,
                null,
                { params: { creation_id: creationRes.data.id, access_token: accessToken } }
            );
            alert("✅ Post published successfully!");
            setCaption("");
            setImageUrl("");
        } catch (err) {
            console.error("Error posting:", err.response?.data || err);
            alert("❌ Failed to publish post. Check image URL and permissions.");
        } finally {
            setLoading(false);
        }
    };

    if (status === "loading") return <p>Loading session...</p>;

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
                {/* Header */}
                <div className="flex justify-between items-center mb-6 w-full">
                    {/* Left side - User Name */}
                    <div className="w-1/2">
                        <h1 className="text-3xl font-bold">
                            Instagram Dashboard
                        </h1>
                        {session?.user?.name && (
                            <p className="text-gray-600 mt-1 text-lg">
                                Welcome, {session.user.name}!
                            </p>
                        )}
                    </div>

                    {/* Right side - Buttons */}
                    <div className="w-1/2 flex flex-col sm:flex-row sm:justify-end gap-4">
                        {/* Instagram DM Button */}
                        <button
                            onClick={() => router.push('/dashboard/instagram-dms')}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl 
                 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-2"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 8h10M7 12h4m1 8l-5-5H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2h-3l-5 5z"
                                />
                            </svg>
                            <span className="font-medium text-center">Instagram DM's</span>
                        </button>

                        {/* Facebook DM Button */}
                        <button
                            onClick={() => router.push('/dashboard/facebook-dms')}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl 
                 transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center space-x-2"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 8h10M7 12h4m1 8l-5-5H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v6a2 2 0 01-2 2h-3l-5 5z"
                                />
                            </svg>
                            <span className="font-medium text-center">Facebook DM's</span>
                        </button>

                        {/* Sign Out Button */}
                        <button
                            onClick={() => signOut()}
                            className="flex-1 bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg hover:bg-red-600 transition-all duration-300"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && <p className="text-red-500 mb-4">{error}</p>}

                {/* Profile Info and Permissions */}
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 p-4">

                    {/* Left Side - Profile Card */}
                    {account ? (
                        <div className="w-full md:w-1/2 bg-white p-6 rounded-xl shadow-md flex flex-col items-center md:items-start space-y-4">
                            <img
                                src={account.profile_picture_url}
                                alt="Profile"
                                className="w-28 h-28 rounded-full border-2 border-gray-200 object-cover mb-2"
                            />
                            <div className="text-center md:text-left">
                                <h2 className="text-2xl font-bold">@{account.username}</h2>
                                {account.name && <p className="text-gray-700">{account.name}</p>}
                                <p className="text-sm text-gray-500 mt-1">
                                    Followers: <span className="font-medium">{account.followers_count}</span> |{" "}
                                    Following: <span className="font-medium">{account.follows_count}</span> |{" "}
                                    Posts: <span className="font-medium">{account.media_count}</span>
                                </p>
                            </div>
                            <div className="w-full bg-gray-50 border border-gray-200 p-3 rounded text-sm text-gray-700 overflow-x-auto">
                                <p className="font-medium mb-1">Access Token:</p>
                                <code className="block text-xs break-all text-gray-800">
                                    {session.accessToken || "Token not available."}
                                </code>
                            </div>
                        </div>
                    ) : <div className="w-full h-full"><p>Loading...</p></div>}

                    {/* Right Side - Token Permissions */}
                    {permissions.length > 0 && (
                        <div className="w-full md:w-1/2 bg-yellow-50 p-5 rounded-xl shadow-md overflow-y-auto max-h-[400px]">
                            <h2 className="text-lg font-semibold mb-4 text-gray-800">Your Token Permissions</h2>
                            <div className="grid grid-cols-1 gap-2">
                                {permissions.map((p) => (
                                    <div
                                        key={p.permission}
                                        className="flex justify-between bg-yellow-100 rounded-md px-4 py-2 text-sm font-medium text-yellow-900 shadow-sm"
                                    >
                                        <span>{p.permission}</span>
                                        <span className={p.status === "granted" ? "text-green-600" : "text-red-600"}>
                                            {p.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

                {/* Create Post */}
                <div className="bg-white p-6 rounded-xl shadow mb-8">
                    <h2 className="text-xl font-semibold mb-3">Create New Post</h2>
                    <input
                        type="text"
                        placeholder="Image URL"
                        className="w-full p-3 border rounded mb-2"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <textarea
                        placeholder="Write a caption..."
                        className="w-full p-3 border rounded mb-3"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                    />
                    <button
                        onClick={createPost}
                        disabled={loading}
                        className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
                    >
                        {loading ? "Publishing..." : "Publish Post"}
                    </button>
                </div>

                {/* Media Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {media.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-xl shadow-md p-3 hover:shadow-lg transition"
                        >
                            <img
                                src={item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url}
                                className="rounded-lg mb-3 w-full object-cover"
                            />
                            <p className="text-sm mb-2">{item.caption || "No caption"}</p>
                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                                <span>❤️ {item.like_count || 0}</span>
                                <span>💬 {item.comments_count || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <button onClick={() => fetchComments(item.id)} className="text-blue-600 text-sm">
                                    Comments
                                </button>
                                <button onClick={() => fetchInsights(item.id)} className="text-green-600 text-sm">
                                    Insights
                                </button>
                                <button onClick={() => deletePost(item.id)} className="text-red-600 text-sm">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modal for Comments or Insights */}
                {modalPost && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white w-full max-w-2xl p-6 rounded-2xl shadow-lg overflow-y-auto max-h-[80vh] relative">
                            <button
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                                onClick={() => {
                                    setModalPost(null);
                                    setModalType(null);
                                    setInsights([]);
                                    setComments([]);
                                }}
                            >
                                ✖
                            </button>

                            {modalType === "comments" && (
                                <>
                                    <h2 className="text-2xl font-semibold mb-4">Comments</h2>
                                    {comments.length === 0 ? (
                                        <p className="text-gray-500 text-center py-10">No comments yet.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {comments.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="flex flex-col space-y-2 p-3 bg-gray-50 rounded-xl shadow-sm"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <p className="font-semibold">{c.username || "Anonymous"}</p>
                                                        <p className="text-xs text-gray-400">{timeAgo(c.timestamp)}</p>
                                                    </div>

                                                    <p className="text-gray-700">{c.text}</p>

                                                    {/* Reply input box */}
                                                    <div className="flex items-center space-x-2 mt-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Write a reply..."
                                                            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                                                            value={replyText[c.id] || ""}
                                                            onChange={(e) =>
                                                                setReplyText({ ...replyText, [c.id]: e.target.value })
                                                            }
                                                        />
                                                        <button
                                                            onClick={() => postReply(c.id, replyText[c.id], "public")}
                                                            className="bg-blue-500 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-600"
                                                        >
                                                            Public
                                                        </button>
                                                        <button
                                                            onClick={() => postReply(c.id, replyText[c.id], "private")}
                                                            className="bg-green-500 text-white px-3 py-2 rounded-md text-sm hover:bg-green-600"
                                                        >
                                                            Private
                                                        </button>
                                                    </div>

                                                    {/* Nested replies */}
                                                    {c.replies?.data?.length > 0 && (
                                                        <div className="ml-6 mt-2 space-y-2">
                                                            {c.replies.data.map((r) => (
                                                                <div key={r.id} className="bg-gray-100 p-2 rounded-lg">
                                                                    <div className="flex justify-between items-center">
                                                                        <p className="font-semibold">{r.username || "Anonymous"}</p>
                                                                        <p className="text-xs text-gray-400">{timeAgo(r.timestamp)}</p>
                                                                    </div>
                                                                    <p className="text-gray-700">{r.text}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                    )}
                                    <div className="mt-4">
                                        <input
                                            type="text"
                                            placeholder="Write a reply..."
                                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-400 outline-none"
                                            value={reply}
                                            onChange={(e) => setReply(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            {modalType === "insights" && (
                                <>
                                    <h2 className="text-2xl font-semibold mb-4 text-center">Post Insights</h2>
                                    {insights.length === 0 ? (
                                        <p className="text-gray-500 text-center py-10">No insights available.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {insights.map((i) => (
                                                <div
                                                    key={i.name}
                                                    className="flex justify-between p-3 bg-gray-50 rounded-xl shadow-sm"
                                                >
                                                    <p className="font-medium text-gray-700">{i.title || i.name}</p>
                                                    <p className="font-semibold text-gray-900">{i.values?.[0]?.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
