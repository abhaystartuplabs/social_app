"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import axios from "axios";

export default function Dashboard() {
    const { data: session, status } = useSession();
    const [account, setAccount] = useState(null);
    const [media, setMedia] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [reply, setReply] = useState("");
    const [caption, setCaption] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [instagramBusinessId, setInstagramBusinessId] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const accessToken = session?.accessToken;
    console.log("accessToken:-",accessToken)

    // 1️⃣ Fetch connected Instagram Business account
    useEffect(() => {
        if (!accessToken || status !== "authenticated") return;

        const fetchAccount = async () => {
            try {
                const pagesRes = await axios.get(
                    "https://graph.facebook.com/v21.0/me/accounts",
                    { params: { access_token: accessToken } }
                );

                const page = pagesRes.data.data?.[0];
                if (!page) throw new Error("No connected Facebook Page found.");

                const igRes = await axios.get(
                    `https://graph.facebook.com/v21.0/${page.id}`,
                    {
                        params: {
                            fields: "instagram_business_account",
                            access_token: accessToken,
                        },
                    }
                );

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

    // 2️⃣ Fetch Instagram account info & media
    useEffect(() => {
        if (!instagramBusinessId || !accessToken) return;

        const fetchData = async () => {
            try {
                const [accountRes, mediaRes] = await Promise.all([
                    axios.get(`https://graph.facebook.com/v21.0/${instagramBusinessId}`, {
                        params: {
                            fields:
                                "username,name,profile_picture_url,followers_count,follows_count,media_count",
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

    // 3️⃣ Fetch comments for a post
    const fetchComments = async (postId) => {
        try {
            setSelectedPost(postId);
            const res = await axios.get(
                `https://graph.facebook.com/v21.0/${postId}/comments`,
                {
                    params: {
                        fields: "id,text,username,timestamp",
                        access_token: accessToken,
                    },
                }
            );
            setComments(res.data.data || []);
        } catch (err) {
            console.error("Error fetching comments:", err.response?.data || err);
        }
    };

    // 4️⃣ Reply to a comment
    const postReply = async (commentId) => {
        if (!reply) return alert("Reply cannot be empty");
        try {
            await axios.post(
                `https://graph.facebook.com/v21.0/${commentId}/replies`,
                null,
                {
                    params: {
                        message: reply,
                        access_token: accessToken,
                    },
                }
            );
            setReply("");
            alert("✅ Reply posted!");
            fetchComments(selectedPost);
        } catch (err) {
            console.error("Error replying to comment:", err.response?.data || err);
            alert("❌ Failed to reply. Check permissions for comments_manage and pages_manage_metadata.");
        }
    };

    // 5️⃣ Delete post
    const deletePost = async (postId) => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        try {
            const res = await axios.delete(
                `https://graph.facebook.com/v21.0/${postId}`,
                {
                    params: { access_token: accessToken },
                }
            );

            console.log("Delete response:", res.data);
            alert("✅ Post deleted!");
            setMedia(media.filter((m) => m.id !== postId));
        } catch (err) {
            const msg = err.response?.data?.error?.message || err.message;

            if (msg.includes("#33")) {
                alert("⚠️ You can only delete posts that were created via the Graph API.");
            } else {
                alert(`❌ Failed to delete post: ${msg}`);
            }

            console.error("Error deleting post:", err.response?.data || err);
        }
    };



    // 6️⃣ Fetch post insights
    const fetchInsights = async (postId) => {
        try {
            const res = await axios.get(
                `https://graph.facebook.com/v21.0/${postId}/insights`,
                {
                    params: {
                        // ✅ Use only valid metrics
                        metric: "impressions,reach,likes,comments,saved,shares",
                        access_token: accessToken,
                    },
                }
            );

            console.log("Insights data:", res.data);

            if (!res.data.data?.length) {
                alert("No insights available for this post.");
                return;
            }

            const insightsText = res.data.data
                .map((m) => `${m.title || m.name}: ${m.values?.[0]?.value}`)
                .join("\n");

            alert(insightsText);
        } catch (err) {
            console.error("Error fetching insights:", err.response?.data || err);
            alert(
                `❌ Failed to fetch insights: ${err.response?.data?.error?.message || "Unknown error"}`
            );
        }
    };



    // 7️⃣ Create new post
    const createPost = async () => {
        if (!imageUrl) return alert("Please enter an image URL");
        setLoading(true);

        try {
            const creationRes = await axios.post(
                `https://graph.facebook.com/v21.0/${instagramBusinessId}/media`,
                null,
                {
                    params: {
                        image_url: imageUrl,
                        caption,
                        access_token: accessToken,
                    },
                }
            );

            const creationId = creationRes.data.id;

            await axios.post(
                `https://graph.facebook.com/v21.0/${instagramBusinessId}/media_publish`,
                null,
                { params: { creation_id: creationId, access_token: accessToken } }
            );

            alert("✅ Post published successfully!");
            setCaption("");
            setImageUrl("");
        } catch (err) {
            console.error("Error posting:", err.response?.data || err);
            alert("❌ Failed to publish post. Make sure image URL is valid and in JPEG/PNG format.");
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
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Instagram Business Dashboard</h1>
                    <button
                        onClick={() => signOut()}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg"
                    >
                        Sign Out
                    </button>
                </div>

                {error && <p className="text-red-500 text-xl">Error:- {error}</p>}
                {account && (
                    <div className="bg-white p-6 rounded-xl shadow flex items-center space-x-6 mb-8">
                        <img
                            src={account.profile_picture_url}
                            className="w-24 h-24 rounded-full border"
                            alt="Profile"
                        />
                        <div>
                            <h2 className="text-2xl font-semibold">@{account.username}</h2>
                            <p className="text-gray-600">{account.name}</p>
                            <p className="text-sm text-gray-500">
                                Followers: {account.followers_count} | Following:{" "}
                                {account.follows_count} | Posts: {account.media_count}
                            </p>
                        </div>
                    </div>
                )}

                {/* Create Post */}
                <div className="bg-white p-6 rounded-xl shadow mb-8">
                    <h2 className="text-xl font-semibold mb-3">Create New Post</h2>
                    <input
                        type="text"
                        placeholder="Image URL"
                        className="w-full p-3 border rounded-lg mb-2"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <textarea
                        placeholder="Write a caption..."
                        className="w-full p-3 border rounded-lg mb-3"
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
                                <button
                                    onClick={() => fetchComments(item.id)}
                                    className="text-blue-600 text-sm"
                                >
                                    Comments
                                </button>
                                <button
                                    onClick={() => fetchInsights(item.id)}
                                    className="text-green-600 text-sm"
                                >
                                    Insights
                                </button>
                                <button
                                    onClick={() => deletePost(item.id)}
                                    className="text-red-600 text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Comments Section */}
                {selectedPost && (
                    <div className="bg-white mt-10 p-6 rounded-xl shadow">
                        <h2 className="text-xl font-semibold mb-4">Comments</h2>
                        {comments.length === 0 ? (
                            <p>No comments yet.</p>
                        ) : (
                            comments.map((c) => (
                                <div key={c.id} className="border-b py-2">
                                    <p className="font-semibold">@{c.username}</p>
                                    <p className="text-gray-700">{c.text}</p>
                                    <button
                                        onClick={() => postReply(c.id)}
                                        className="text-blue-600 text-xs mt-1"
                                    >
                                        Reply
                                    </button>
                                </div>
                            ))
                        )}
                        <input
                            type="text"
                            placeholder="Write a reply..."
                            className="w-full p-2 border rounded mt-4"
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
