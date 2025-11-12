"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import axios from "axios";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [account, setAccount] = useState(null);
  const [media, setMedia] = useState([]);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [instagramBusinessId, setInstagramBusinessId] = useState(null);
  const [error, setError] = useState(null);

  const accessToken = session?.accessToken;

  // 🧠 1️⃣ Fetch connected Instagram Business account dynamically
  useEffect(() => {
    if (!accessToken || status !== "authenticated") return;

    const fetchConnectedAccount = async () => {
      try {
        // Step 1: Get the user's connected Pages
        const pagesRes = await axios.get(
          `https://graph.facebook.com/v21.0/me/accounts`,
          { params: { access_token: accessToken } }
        );

        const page = pagesRes.data.data?.[0];
        if (!page) throw new Error("No connected Facebook Page found.");

        // Step 2: Get the Instagram Business account linked to that Page
        const igRes = await axios.get(
          `https://graph.facebook.com/v21.0/${page.id}`,
          {
            params: {
              fields: "instagram_business_account",
              access_token: accessToken,
            },
          }
        );

        const igAccountId = igRes.data.instagram_business_account?.id;
        if (!igAccountId) throw new Error("No Instagram Business Account linked.");

        setInstagramBusinessId(igAccountId);
      } catch (err) {
        console.error("Error fetching connected account:", err.response?.data || err);
        setError("Failed to fetch connected account. Check permissions.");
      }
    };

    fetchConnectedAccount();
  }, [accessToken, status]);

  // 🧠 2️⃣ Fetch Instagram account and media after we know the ID
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
              fields: "id,caption,media_url,permalink",
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

  // 🧠 3️⃣ Create & Publish a Post
  const createPost = async () => {
    if (!imageUrl) return alert("Please enter an image URL");
    if (!instagramBusinessId) return alert("Instagram account not connected");

    setLoading(true);
    try {
      // Step 1: Create media object
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

      // Step 2: Publish post
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
      alert("❌ Failed to publish post. Check permissions or image URL.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading")
    return <p className="text-gray-600 text-center mt-10">Loading session...</p>;

  if (!session)
    return (
      <p className="text-center mt-10 text-gray-700">
        Please <a href="/" className="text-blue-600 underline">log in</a> first.
      </p>
    );

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <div className="max-w-5xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Instagram Business Dashboard
          </h1>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Profile Section */}
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
                Followers: {account.followers_count} | Following: {account.follows_count} | Posts:{" "}
                {account.media_count}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">Loading account details...</p>
        )}

        {/* Create Post Section */}
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
