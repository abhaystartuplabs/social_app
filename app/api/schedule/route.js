import { NextResponse } from 'next/server';
import axios from 'axios';
import { createScheduledPost, getScheduledPosts, updatePostStatus, deleteScheduledPost } from '../../../lib/db';

// --- Utility function to perform the Instagram publishing steps ---
async function publishToInstagram(instagramBusinessId, accessToken, imageUrl, caption) {
    try {
        console.log("1. Creating Media Container...");
        const creationRes = await axios.post(
            `https://graph.facebook.com/v21.0/${instagramBusinessId}/media`,
            null,
            { params: { image_url: imageUrl, caption, access_token: accessToken } }
        );
        const creationId = creationRes.data.id;
        console.log("   -> Container ID:", creationId);

        console.log("2. Publishing Media Container...");
        await axios.post(
            `https://graph.facebook.com/v21.0/${instagramBusinessId}/media_publish`,
            null,
            { params: { creation_id: creationId, access_token: accessToken } }
        );

        console.log("3. Publish success.");
        return { success: true, creationId };
    } catch (err) {
        console.error("❌ Instagram Publishing Error:", err.response?.data?.error || err.message);
        return { success: false, error: err.response?.data?.error?.message || "Publishing failed" };
    }
}

// -----------------------------------------------------------------

/**
 * GET: Retrieve all scheduled posts.
 */
export async function GET() {
    try {
        const posts = getScheduledPosts();
        return NextResponse.json({ success: true, posts });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to fetch scheduled posts." }, { status: 500 });
    }
}

/**
 * POST: Schedule a new post.
 */
export async function POST(request) {
    try {
        const data = await request.json();
        const { imageUrl, caption, scheduleTime } = data;

        if (!imageUrl || !scheduleTime) {
            return NextResponse.json({ success: false, message: "Image URL and schedule time are required." }, { status: 400 });
        }

        const newPost = createScheduledPost({ imageUrl, caption, scheduleTime });
        return NextResponse.json({ success: true, post: newPost });
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to schedule post." }, { status: 500 });
    }
}

/**
 * PATCH: Publish a post immediately (Manual Publish button).
 */
export async function PATCH(request) {
    try {
        const { postId, instagramBusinessId, accessToken, imageUrl, caption } = await request.json();

        if (!postId || !instagramBusinessId || !accessToken) {
            return NextResponse.json({ success: false, message: "Missing required parameters for publishing." }, { status: 400 });
        }

        // 1. Publish to Instagram
        const result = await publishToInstagram(instagramBusinessId, accessToken, imageUrl, caption);

        if (result.success) {
            // 2. Update status in mock DB
            const updatedPost = updatePostStatus(postId, "PUBLISHED", result.creationId);
            return NextResponse.json({ success: true, post: updatedPost });
        } else {
            // 3. Mark as failed
            updatePostStatus(postId, "FAILED");
            return NextResponse.json({ success: false, message: result.error }, { status: 500 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: "Internal server error during publishing." }, { status: 500 });
    }
}

/**
 * DELETE: Delete a scheduled post.
 */
export async function DELETE(request) {
    try {
        const { postId } = await request.json();
        const deleted = deleteScheduledPost(postId);

        if (deleted) {
            return NextResponse.json({ success: true, message: "Post deleted." });
        } else {
            return NextResponse.json({ success: false, message: "Post not found." }, { status: 404 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: "Failed to delete post." }, { status: 500 });
    }
}