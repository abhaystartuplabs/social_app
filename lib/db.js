// NOTE: Replace this mock implementation with your actual MongoDB connection and schema.

// Placeholder for your MongoDB URI (Not used in this mock)
const MONGO_URI = "mongodb+srv://Abhay_Startuplabs:CI94NyRogducbXuV@practicecluster.kspr2rh.mongodb.net/?appName=PracticeCluster";

let scheduledPosts = []; // In-memory database array

/**
 * Creates a unique ID for the mock database.
 */
const generateId = () => Date.now().toString();

/**
 * Simulates connecting to MongoDB.
 */
export const connectDB = () => {
    console.log("Database connection simulated.");
    // In a real app, you would connect to Mongo here:
    mongoose.connect(MONGO_URI);
};

/**
 * Saves a new scheduled post to the mock database.
 */
export const createScheduledPost = (postData) => {
    const newPost = {
        id: generateId(),
        ...postData,
        status: "SCHEDULED", // PENDING, PUBLISHED, FAILED
        createdAt: new Date().toISOString(),
        publishedAt: null,
    };
    scheduledPosts.push(newPost);
    return newPost;
};

/**
 * Retrieves all scheduled posts.
 */
export const getScheduledPosts = () => {
    // Sort by scheduled time, then creation time
    return scheduledPosts.sort((a, b) => new Date(a.scheduleTime) - new Date(b.scheduleTime));
};

/**
 * Updates the status of a scheduled post.
 */
export const updatePostStatus = (id, status, creationId = null) => {
    const postIndex = scheduledPosts.findIndex(p => p.id === id);
    if (postIndex > -1) {
        scheduledPosts[postIndex] = {
            ...scheduledPosts[postIndex],
            status: status,
            creationId: creationId || scheduledPosts[postIndex].creationId,
            publishedAt: status === "PUBLISHED" ? new Date().toISOString() : scheduledPosts[postIndex].publishedAt,
        };
        return scheduledPosts[postIndex];
    }
    return null;
};

/**
 * Deletes a scheduled post.
 */
export const deleteScheduledPost = (id) => {
    const initialLength = scheduledPosts.length;
    scheduledPosts = scheduledPosts.filter(p => p.id !== id);
    return scheduledPosts.length < initialLength;
};