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

// 🔥 MongoDB connection
const uri = "mongodb+srv://dheerajshahi162:Dheeraj@1994@wealthchat.berts9p.mongodb.net/?retryWrites=true&w=majority&appName=wealthchat";
const client = new MongoClient(uri);

let users = {};
let lastMessageTime = {};
let messages = [];

async function startServer() {
    await client.connect();
    console.log("✅ MongoDB Connected");

    const db = client.db("chatDB");
    const collection = db.collection("messages");

    // 🔥 Load old messages
    messages = await collection.find().sort({ _id: 1 }).limit(100).toArray();

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // 🔥 Send old messages
        socket.emit("chat history", messages);

        // ✅ JOIN
        socket.on("join", (username) => {
            if (!username || typeof username !== "string") return;

            username = username.trim().substring(0, 20);
            users[socket.id] = username;

            const joinMsg = {
                name: "System",
                message: `${username} joined the chat`
            };

            messages.push(joinMsg);
            collection.insertOne(joinMsg); // 💾 DB save

            io.emit("chat message", joinMsg);
        });

        // ✅ MESSAGE
        socket.on("chat message", async (data) => {
            if (!data || typeof data.message !== "string") return;

            // 🔥 Anti-spam
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

            // 🔥 Limit memory
            if (messages.length > 100) messages.shift();

            await collection.insertOne(messageData); // 💾 DB save

            io.emit("chat message", messageData);
        });

        // ✅ DISCONNECT
        socket.on("disconnect", () => {
            if (users[socket.id]) {
                const leaveMsg = {
                    name: "System",
                    message: `${users[socket.id]} left the chat`
                };

                messages.push(leaveMsg);
                collection.insertOne(leaveMsg);

                io.emit("chat message", leaveMsg);

                delete users[socket.id];
                delete lastMessageTime[socket.id];
            }

            console.log("User disconnected:", socket.id);
        });
    });
}

startServer();

// PORT
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});