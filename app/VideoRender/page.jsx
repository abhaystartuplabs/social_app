"use client";

const Page = () => {
  return (
    <div className="p-6">
      <h1 className="text-xl mb-4 font-bold">Video Streaming in Chunks with Rate Limiting</h1>

      <video
        controls
        width="700"
        autoPlay={false}
        src="/api/Video"     
        style={{
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      ></video>
    </div>
  );
};

export default Page;
