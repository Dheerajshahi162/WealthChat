const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { MongoClient } = require("mongodb");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));

// ✅ Mongo URI from Render ENV
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// 🔥 DATA STORE
let users = {};
let lastMessageTime = {};
let messages = [];

async function startServer() {
    try {
        await client.connect();
        console.log("✅ MongoDB Connected");

        const db = client.db("chatDB");
        const collection = db.collection("messages");

        // 🔥 Load last 100 messages
        messages = await collection.find().sort({ _id: 1 }).limit(100).toArray();

        io.on("connection", (socket) => {
            console.log("User connected:", socket.id);

            // 🔥 Send chat history
            socket.emit("chat history", messages);

            // =====================================
            // 🔥 JOIN
            // =====================================
            socket.on("join", ({ name, avatar }) => {
                if (!name || typeof name !== "string") return;

                name = name.trim().substring(0, 20);

                users[socket.id] = {
                    name,
                    avatar: avatar || "https://i.pravatar.cc/100"
                };

                const joinMsg = {
                    name: "System",
                    message: `${name} joined the chat`
                };

                messages.push(joinMsg);
                collection.insertOne(joinMsg);

                io.emit("chat message", joinMsg);

                // 👥 update users
                io.emit("user list", Object.values(users));
                io.emit("user count", Object.keys(users).length);
            });

            // =====================================
            // 🔥 MESSAGE
            // =====================================
            socket.on("chat message", async (data) => {
                if (!data || typeof data.message !== "string") return;

                const now = Date.now();

                // 🔥 Anti-spam (1 sec)
                if (lastMessageTime[socket.id] && now - lastMessageTime[socket.id] < 1000) {
                    return;
                }
                lastMessageTime[socket.id] = now;

                const user = users[socket.id];

                const messageData = {
                    name: user?.name || "Guest",
                    avatar: user?.avatar,
                    message: data.message.substring(0, 200)
                };

                messages.push(messageData);

                // 🔥 limit memory
                if (messages.length > 100) messages.shift();

                await collection.insertOne(messageData);

                io.emit("chat message", messageData);
            });

            // =====================================
            // ✍️ TYPING
            // =====================================
            socket.on("typing", (name) => {
                socket.broadcast.emit("typing", name);
            });

            // =====================================
            // ❌ DISCONNECT
            // =====================================
            socket.on("disconnect", async () => {
                const user = users[socket.id];

                if (user) {
                    const leaveMsg = {
                        name: "System",
                        message: `${user.name} left the chat`
                    };

                    messages.push(leaveMsg);
                    await collection.insertOne(leaveMsg);

                    io.emit("chat message", leaveMsg);

                    delete users[socket.id];
                    delete lastMessageTime[socket.id];

                    // 👥 update users
                    io.emit("user list", Object.values(users));
                    io.emit("user count", Object.keys(users).length);
                }

                console.log("User disconnected:", socket.id);
            });
        });

    } catch (err) {
        console.error("❌ MongoDB Error:", err);
    }
}

startServer();

// PORT (Render)
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});