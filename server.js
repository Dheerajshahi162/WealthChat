const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static("public"));

// ✅ Mongo URI
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
        const messageCollection = db.collection("messages");
        const usersCollection = db.collection("users");

        // 🔥 Load messages
        messages = await messageCollection.find().sort({ _id: 1 }).limit(100).toArray();

        io.on("connection", (socket) => {
            console.log("User connected:", socket.id);

            socket.emit("chat history", messages);

            // =====================================
            // 🔐 SIGNUP
            // =====================================
            socket.on("signup", async ({ email, password, name }) => {
                if (!email || !password || !name) return;

                const exist = await usersCollection.findOne({ email });
                if (exist) {
                    socket.emit("auth error", "User already exists");
                    return;
                }

                const hash = await bcrypt.hash(password, 10);

                await usersCollection.insertOne({
                    email,
                    password: hash,
                    name,
                    avatar: "https://i.pravatar.cc/100"
                });

                socket.emit("signup success");
            });

            // =====================================
            // 🔐 LOGIN
            // =====================================
            socket.on("login", async ({ email, password }) => {
                const user = await usersCollection.findOne({ email });

                if (!user) {
                    socket.emit("auth error", "User not found");
                    return;
                }

                const match = await bcrypt.compare(password, user.password);

                if (!match) {
                    socket.emit("auth error", "Wrong password");
                    return;
                }

                users[socket.id] = {
                    name: user.name,
                    avatar: user.avatar
                };

                socket.emit("login success", {
                    name: user.name,
                    avatar: user.avatar
                });

                // 👥 update users
                io.emit("user list", Object.values(users));
                io.emit("user count", Object.keys(users).length);
            });

            // =====================================
            // 🔥 JOIN (after login)
            // =====================================
            socket.on("join", ({ name, avatar }) => {
                if (!name) return;

                users[socket.id] = {
                    name,
                    avatar: avatar || "https://i.pravatar.cc/100"
                };

                const msg = {
                    name: "System",
                    message: `${name} joined the chat`
                };

                messages.push(msg);
                messageCollection.insertOne(msg);

                io.emit("chat message", msg);

                io.emit("user list", Object.values(users));
                io.emit("user count", Object.keys(users).length);
            });

            // =====================================
            // 💬 MESSAGE
            // =====================================
            socket.on("chat message", async (data) => {
                if (!data || typeof data.message !== "string") return;

                const now = Date.now();

                if (lastMessageTime[socket.id] && now - lastMessageTime[socket.id] < 1000) return;

                lastMessageTime[socket.id] = now;

                const user = users[socket.id];

                const msgData = {
                    name: user?.name || "Guest",
                    avatar: user?.avatar,
                    message: data.message.substring(0, 200)
                };

                messages.push(msgData);
                if (messages.length > 100) messages.shift();

                await messageCollection.insertOne(msgData);

                io.emit("chat message", msgData);
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
                    const msg = {
                        name: "System",
                        message: `${user.name} left the chat`
                    };

                    messages.push(msg);
                    await messageCollection.insertOne(msg);

                    io.emit("chat message", msg);

                    delete users[socket.id];
                    delete lastMessageTime[socket.id];

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

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});