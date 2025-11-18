"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import axios from "axios";
import Link from "next/link";

// Helper to format time remaining
const timeUntil = (scheduleTime) => {
    const diff = new Date(scheduleTime) - new Date();
    if (diff <= 0) return "Due now";

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} days`;
    if (hours > 0) return `in ${hours} hours`;
    if (minutes > 0) return `in ${minutes} minutes`;
    return `in ${seconds} seconds`;
};

export default function PostScheduler() {
    const { data: session, status } = useSession();
    const [instagramBusinessId, setInstagramBusinessId] = useState(null);
    const [scheduledPosts, setScheduledPosts] = useState([]);
    const [imageUrl, setImageUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const accessToken = session?.accessToken;

    // --- Data Fetching ---

    // 1. Fetch Instagram Business ID (reused from your dashboard logic)
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
                setError("Failed to fetch IG Business ID. Check permissions.");
            }
        };
        fetchAccount();
    }, [accessToken, status]);

    // 2. Fetch Scheduled Posts from local API
    const fetchScheduledPosts = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await axios.get("/api/schedule");
            console.log("res to fetch scheduled post:-", res)
            setScheduledPosts(res.data.posts || []);
        } catch (err) {
            console.error("Error fetching scheduled posts:", err);
            setError("Failed to load scheduled posts from server.");
        }
    }, [accessToken]);

    useEffect(() => {
        fetchScheduledPosts();
    }, [fetchScheduledPosts]);


    // --- Actions ---

    const handleSchedulePost = async (e) => {
        e.preventDefault();
        if (!imageUrl || !scheduleTime) return alert("Please fill in image URL and schedule time.");
        if (!instagramBusinessId) return alert("Instagram Business ID is not yet available. Try again.");

        setLoading(true);
        setError(null);

        try {
            await axios.post("/api/schedule", { imageUrl, caption, scheduleTime });
            alert("✅ Post scheduled successfully!");
            // Reset form
            setImageUrl("");
            setCaption("");
            setScheduleTime("");
            fetchScheduledPosts();
        } catch (err) {
            console.error("Error scheduling post:", err.response?.data || err);
            setError(err.response?.data?.message || "Failed to schedule post.");
        } finally {
            setLoading(false);
        }
    };

    const handlePublishNow = async (post) => {
        if (!instagramBusinessId || !accessToken) return alert("Missing authentication details.");

        if (!confirm(`Are you sure you want to publish the post scheduled for ${new Date(post.scheduleTime).toLocaleString()} immediately?`)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await axios.patch("/api/schedule", {
                postId: post.id,
                instagramBusinessId,
                accessToken,
                imageUrl: post.imageUrl,
                caption: post.caption,
            });

            if (res.data.success) {
                alert("✅ Post published successfully! Status updated.");
                fetchScheduledPosts(); // Refresh list
            } else {
                throw new Error(res.data.message || "Failed to publish.");
            }
        } catch (err) {
            console.error("Error publishing post:", err.response?.data || err);
            setError(`❌ Failed to publish post: ${err.response?.data?.message || 'Check permissions and API status.'}`);
            fetchScheduledPosts(); // Refresh status (likely FAILED)
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!confirm("Are you sure you want to delete this scheduled post?")) return;

        try {
            await axios.delete("/api/schedule", { data: { postId } });
            alert("🗑️ Post deleted.");
            fetchScheduledPosts();
        } catch (err) {
            console.error("Error deleting post:", err.response?.data || err);
            alert("❌ Failed to delete post.");
        }
    };

    if (status === "loading") return <div className="text-center p-10">Loading session...</div>;
    if (!session) return <div className="text-center p-10"><Link href="/login" className="text-blue-600 underline">Please log in</Link> to access the scheduler.</div>;

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Post Scheduler</h1>
                    <button
                        onClick={() => signOut()}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition"
                    >
                        Sign Out
                    </button>
                </div>

                {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

                {/* Scheduling Form */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-blue-200">
                    <h2 className="text-xl font-semibold mb-4 text-blue-700">Schedule New Post</h2>
                    <form onSubmit={handleSchedulePost} className="space-y-4">
                        <input
                            type="url"
                            placeholder="Image URL (e.g., https://placehold.it/500)"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            required
                        />
                        <textarea
                            placeholder="Write a caption..."
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                        />
                        <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700">
                            Schedule Time (Local Time)
                        </label>
                        <input
                            id="scheduleTime"
                            type="datetime-local"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading || !instagramBusinessId}
                            className="w-full bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold shadow-md disabled:bg-gray-400"
                        >
                            {loading ? "Scheduling..." : "Schedule Post"}
                        </button>
                    </form>
                </div>

                {/* Scheduled Posts List */}
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Scheduled Posts ({scheduledPosts.length})</h2>

                {scheduledPosts.length === 0 ? (
                    <p className="p-6 bg-yellow-100 border border-yellow-300 rounded-xl text-center text-yellow-800">
                        No posts currently scheduled. Start scheduling above!
                    </p>
                ) : (
                    <div className="space-y-4">
                        {scheduledPosts.map((post) => (
                            <div
                                key={post.id}
                                className="flex flex-col md:flex-row bg-white p-4 rounded-xl shadow-md items-start md:items-center space-y-3 md:space-y-0 md:space-x-4 border-l-4"
                                style={{
                                    borderColor: post.status === 'PUBLISHED' ? '#10B981' : post.status === 'FAILED' ? '#EF4444' : '#3B82F6'
                                }}
                            >
                                {/* Image and Info */}
                                <div className="flex-shrink-0 w-full md:w-1/4 flex space-x-3 items-center">
                                    <img
                                        src={post.imageUrl}
                                        alt="Post Preview"
                                        className="w-16 h-16 object-cover rounded-lg"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/64x64/E0E0E0/333?text=Image+Err"; }}
                                    />
                                    <div>
                                        <p className="font-semibold text-sm line-clamp-2">{post.caption || "No Caption"}</p>
                                        <p className="text-xs text-gray-500">{new Date(post.scheduleTime).toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Status and Time */}
                                <div className="flex-1">
                                    <span
                                        className={`px-3 py-1 text-xs font-semibold rounded-full ${post.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
                                                post.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                            }`}
                                    >
                                        {post.status}
                                    </span>
                                    {post.status === 'PENDING' && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {timeUntil(post.scheduleTime)}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex space-x-3 flex-shrink-0">
                                    {post.status === 'PENDING' && (
                                        <button
                                            onClick={() => handlePublishNow(post)}
                                            disabled={loading}
                                            className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-600 transition disabled:bg-gray-400"
                                        >
                                            {loading ? "Publishing..." : "Publish Now"}
                                        </button>
                                    )}

                                    {post.status !== 'PUBLISHED' && (
                                        <button
                                            onClick={() => handleDeletePost(post.id)}
                                            disabled={loading}
                                            className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-600 transition disabled:bg-gray-400"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>
        </main>
    );
}