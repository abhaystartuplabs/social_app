// lib/rate-limit.js

const rateLimitMap = new Map();


export function rateLimit({ limit, windowMs }) {
  return (ip) => {
    const now = Date.now();
    const windowStart = now - windowMs;


    const userData = rateLimitMap.get(ip) || [];

    // keep only entries within window
    const requests = userData.filter((time) => time > windowStart);

    if (requests.length >= limit) {
      return {
        success: false,
        remaining: 0,
      };
    }

    requests.push(now);
    rateLimitMap.set(ip, requests);

    return {
      success: true,
      remaining: limit - requests.length,
    };
  };
}
