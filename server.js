const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { MongoClient } = require("mongodb");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(express.static("public"));

// ✅ 🔥 IMPORTANT: .env use karo (SECURE)
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

let users = {};
let lastMessageTime = {};
let messages = [];

async function startServer() {
    try {
        await client.connect();
        console.log("✅ MongoDB Connected");

        const db = client.db("chatDB");
        const collection = db.collection("messages");

        // 🔥 Load old messages
        messages = await collection.find().sort({ _id: 1 }).limit(100).toArray();

        io.on("connection", (socket) => {
            console.log("User connected:", socket.id);

            socket.emit("chat history", messages);

            // JOIN
            socket.on("join", async (username) => {
                if (!username || typeof username !== "string") return;

                username = username.trim().substring(0, 20);
                users[socket.id] = username;

                const joinMsg = {
                    name: "System",
                    message: `${username} joined the chat`
                };

                messages.push(joinMsg);
                await collection.insertOne(joinMsg);

                io.emit("chat message", joinMsg);
            });

            // MESSAGE
            socket.on("chat message", async (data) => {
                if (!data || typeof data.message !== "string") return;

                const now = Date.now();
                if (lastMessageTime[socket.id] && now - lastMessageTime[socket.id] < 1000) {
                    return;
                }
                lastMessageTime[socket.id] = now;

                const messageData = {
                    name: users[socket.id] || "Guest",
                    message: data.message.substring(0, 200)
                };

                messages.push(messageData);
                if (messages.length > 100) messages.shift();

                await collection.insertOne(messageData);

                io.emit("chat message", messageData);
            });

            // DISCONNECT
            socket.on("disconnect", async () => {
                if (users[socket.id]) {
                    const leaveMsg = {
                        name: "System",
                        message: `${users[socket.id]} left the chat`
                    };

                    messages.push(leaveMsg);
                    await collection.insertOne(leaveMsg);

                    io.emit("chat message", leaveMsg);

                    delete users[socket.id];
                    delete lastMessageTime[socket.id];
                }

                console.log("User disconnected:", socket.id);
            });
        });

    } catch (err) {
        console.error("❌ MongoDB Error:", err);
    }
}

startServer();

// PORT
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});