"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import axios from "axios";
import Link from "next/link";

// Backend Base URL
const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://backend-app-nu-ebon.vercel.app/api/schedule';

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

    // -------------------------
    // FETCH IG BUSINESS ID
    // -------------------------
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
                    { params: { fields: "instagram_business_account", access_token: accessToken } }
                );

                const igId = igRes.data.instagram_business_account?.id;
                if (!igId) throw new Error("No linked Instagram Business Account found.");

                setInstagramBusinessId(igId);
            } catch (err) {
                console.log(err);
                setError("Failed to fetch IG Business ID");
            }
        };

        fetchAccount();
    }, [accessToken, status]);

    // -------------------------
    // FETCH SCHEDULED POSTS
    // -------------------------
    const fetchScheduledPosts = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/getPosts`);
            setScheduledPosts(res.data.posts || []);
        } catch (err) {
            console.error(err);
            setError("Failed to load scheduled posts.");
        }
    }, []);

    useEffect(() => {
        fetchScheduledPosts();
    }, [fetchScheduledPosts]);

    // -------------------------
    // CREATE SCHEDULED POST
    // -------------------------
    const handleSchedulePost = async (e) => {
        e.preventDefault();

        if (!imageUrl || !scheduleTime) return alert("Image URL & schedule time are required.");

        setLoading(true);

        try {
            await axios.post(`${API}/createPost`, {
                imageUrl,
                caption,
                scheduleTime,
                instagramBusinessId,
                accessToken
            });

            alert("Post scheduled!");
            setImageUrl("");
            setCaption("");
            setScheduleTime("");

            fetchScheduledPosts();
        } catch (err) {
            console.error(err);
            setError("Failed to schedule post");
        } finally {
            setLoading(false);
        }
    };

    // -------------------------
    // PUBLISH NOW
    // -------------------------
    const handlePublishNow = async (post) => {
        if (!confirm("Publish this post now?")) return;

        setLoading(true);

        try {
            const res = await axios.patch(`${API}/publishNow`, {
                postId: post._id,
                instagramBusinessId,
                accessToken,
                imageUrl: post.imageUrl,
                caption: post.caption,
            });

            if (res.data.success) {
                alert("Published successfully!");
                fetchScheduledPosts();
            } else {
                alert(res.data.message);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to publish post.");
        } finally {
            setLoading(false);
        }
    };

    // -------------------------
    // DELETE POST
    // -------------------------
    const handleDeletePost = async (postId) => {
        if (!confirm("Delete this scheduled post?")) return;

        try {
            await axios.delete(`${API}/deletePost`, { data: { postId } });
            alert("Deleted.");
            fetchScheduledPosts();
        } catch (err) {
            console.error(err);
            alert("Failed to delete post.");
        }
    };

    // -------------------------

    if (status === "loading")
        return <p className="text-center p-6">Loading session...</p>;

    if (!session)
        return (
            <p className="text-center p-6">
                <Link href="/login" className="text-blue-600 underline">Please Login</Link>
            </p>
        );

    return (
        <main className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* HEADER */}
                <div className="flex justify-between mb-8">
                    <h1 className="text-3xl font-bold">Post Scheduler</h1>
                    <button
                        onClick={() => signOut()}
                        className="bg-red-500 px-4 py-2 text-white rounded-lg"
                    >
                        Sign Out
                    </button>
                </div>

                {error && (
                    <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* CREATE POST */}
                <div className="bg-white p-6 rounded-xl shadow mb-8">
                    <h2 className="text-xl font-semibold mb-4">Schedule New Post</h2>

                    <form className="space-y-4" onSubmit={handleSchedulePost}>
                        <input
                            type="url"
                            placeholder="Image URL"
                            className="w-full border p-3 rounded"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            required
                        />

                        <textarea
                            placeholder="Write caption..."
                            className="w-full border p-3 rounded min-h-[100px]"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                        />

                        <input
                            type="datetime-local"
                            className="w-full border p-3 rounded"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            required
                        />

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-lg"
                            disabled={loading}
                        >
                            {loading ? "Scheduling..." : "Schedule Post"}
                        </button>
                    </form>
                </div>

                {/* POST LIST */}
                <h2 className="text-2xl font-bold mb-4">
                    Scheduled Posts ({scheduledPosts.length})
                </h2>

                {scheduledPosts.map((post) => (
                    <div
                        key={post._id}
                        className="bg-white p-4 rounded-xl shadow flex justify-between items-center mb-3"
                    >
                        <div className="flex items-center space-x-3">
                            <img
                                src={post.imageUrl}
                                className="w-16 h-16 rounded object-cover"
                            />
                            <div>
                                <p className="font-bold text-sm">{post.caption}</p>
                                <p className="text-xs text-gray-500">
                                    {new Date(post.scheduleTime).toLocaleString()}
                                </p>
                                {post.status === "SCHEDULED" && (
                                    <p className="text-xs text-blue-600">
                                        {timeUntil(post.scheduleTime)}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            {post.status === "SCHEDULED" && (
                                <button
                                    onClick={() => handlePublishNow(post)}
                                    className="bg-green-500 text-white px-3 py-2 rounded"
                                >
                                    Publish Now
                                </button>
                            )}

                            <button
                                onClick={() => handleDeletePost(post._id)}
                                className="bg-red-500 text-white px-3 py-2 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}
