"use client";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import axios from "axios";

export default function Dashboard() {
  const [account, setAccount] = useState(null);
  const [media, setMedia] = useState([]);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
    const { data: session, status } = useSession();

  // ✅ Replace with your actual values or load from session
  const accessToken =
    session.accessToken; // From your working flow
  const instagramBusinessId = "17841478332379447"; // From your connected account

  // 👉 Fetch Account Details
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const res = await axios.get(
          `https://graph.facebook.com/v21.0/${instagramBusinessId}`,
          {
            params: {
              fields:
                "username,name,profile_picture_url,followers_count,follows_count,media_count",
              access_token: accessToken,
            },
          }
        );
        setAccount(res.data);
      } catch (err) {
        console.error("Error fetching account:", err.response?.data || err);
      }
    };

    const fetchMedia = async () => {
      try {
        const res = await axios.get(
          `https://graph.facebook.com/v21.0/${instagramBusinessId}/media`,
          { params: { fields: "id,caption,media_url,permalink", access_token: accessToken } }
        );
        setMedia(res.data.data || []);
      } catch (err) {
        console.error("Error fetching media:", err.response?.data || err);
      }
    };

    fetchAccount();
    fetchMedia();
  }, []);

  // 👉 Create and Publish a Post
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

      // publish
      await axios.post(
        `https://graph.facebook.com/v21.0/${instagramBusinessId}/media_publish`,
        null,
        {
          params: {
            creation_id: creationId,
            access_token: accessToken,
          },
        }
      );

      alert("✅ Post published successfully!");
      setCaption("");
      setImageUrl("");
    } catch (err) {
      console.error("Error posting:", err.response?.data || err);
      alert("❌ Failed to publish post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <div className="max-w-5xl w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          Instagram Business Dashboard
        </h1>

        {account ? (
          <div className="bg-white p-6 rounded-2xl shadow-lg flex items-center space-x-6">
            <img
              src={account.profile_picture_url}
              alt="Profile"
              className="w-24 h-24 rounded-full border"
            />
            <div>
              <h2 className="text-2xl font-semibold">@{account.username}</h2>
              <p className="text-gray-600">{account.name}</p>
              <p className="mt-2 text-sm text-gray-500">
                Followers: {account.followers_count} | Following:{" "}
                {account.follows_count} | Posts: {account.media_count}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Loading account details...</p>
        )}

        {/* Create Post */}
        <div className="bg-white mt-8 p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Create New Post</h2>
          <input
            type="text"
            placeholder="Image URL"
            className="w-full p-3 border rounded-lg mb-3"
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
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
          >
            {loading ? "Publishing..." : "Publish Post"}
          </button>
        </div>

        {/* Media Gallery */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {media.map((item) => (
            <a
              key={item.id}
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-3 rounded-xl shadow-md hover:shadow-xl transition"
            >
              <img
                src={item.media_url}
                alt={item.caption}
                className="rounded-xl mb-2 w-full object-cover"
              />
              <p className="text-sm text-gray-600 line-clamp-2">
                {item.caption || "No caption"}
              </p>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
