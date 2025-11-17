import { rateLimit } from "../../../lib/rate-limit";
import fs from "fs";
import path from "path";

const limiter = rateLimit({
    limit: 10,        // 10 requests
    windowMs: 60_000, // per minute
});


export async function GET(req) {
    // Rate Limit: Identify IP
    const ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "127.0.0.1";

    const limitCheck = limiter(ip);

    //   if (!limitCheck.success) {
    //     return new Response("Too many requests", { status: 429 });
    //   }

    if (!limitCheck.success) {
        console.error(
            "🚨 RATE LIMIT BLOCKED 🚨",
            `\nIP: ${ip}`,
            `\nTime: ${new Date().toLocaleString()}`,
            `\nLimit: 10 req/min`
        );

        return Response.json(
            {
                message: "Rate limit exceeded",
                ip,
                limit: 10,
                windowMs: 60_000,
                remainingTime: limitCheck.remainingTime + "ms",
            },
            { status: 429 }
        );
    }



    // Video Streaming Logic
    const range = req.headers.get("range");
    if (!range) {
        return new Response("Range header required", { status: 400 });
    }

    // Correct path (file MUST be inside /public/videos)
    const videoPath = path.join(process.cwd(), "Public/Sample.mp4");
    const videoSize = fs.statSync(videoPath).size;

    const CHUNK_SIZE = 1_000_000; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "video/mp4",
    };

    const stream = fs.createReadStream(videoPath, { start, end });

    return new Response(stream, { status: 206, headers });
}



// Public/Sample.mp4