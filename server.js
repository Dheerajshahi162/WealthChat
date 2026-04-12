require("dotenv").config();

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

// =====================================
// 🔥 MONGO INIT
// =====================================
const uri = process.env.MONGO_URI;

if (!uri) {
    console.error("❌ MONGO_URI missing in .env");
    process.exit(1);
}

console.log("🔗 Mongo URI Loaded");

const client = new MongoClient(uri);

// =====================================
// 🔥 DATA STORE
// =====================================
let users = {};
let lastMessageTime = {};
let messages = [];

// =====================================
// 🔒 SANITIZER
// =====================================
function clean(input = "") {
    return String(input).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// =====================================
// 🚀 START SERVER
// =====================================
async function startServer() {
    try {
        await client.connect();
        console.log("✅ MongoDB Connected");

        const db = client.db("chatDB");
        const messageCollection = db.collection("messages");
        const usersCollection = db.collection("users");

        // 🔥 LOAD HISTORY
        messages = await messageCollection
            .find()
            .sort({ _id: 1 })
            .limit(100)
            .toArray();

        io.on("connection", (socket) => {
            console.log("👤 Connected:", socket.id);

            socket.emit("chat history", messages);

            // =====================================
            // 🔐 SIGNUP
            // =====================================
            socket.on("signup", async ({ email, password, name }) => {
                try {
                    if (!email || !password || !name) {
                        socket.emit("auth error", "All fields required");
                        return;
                    }

                    const exist = await usersCollection.findOne({ email });

                    if (exist) {
                        socket.emit("auth error", "User already exists");
                        return;
                    }

                    const hash = await bcrypt.hash(password, 10);

                    await usersCollection.insertOne({
                        email,
                        password: hash,
                        name: clean(name),
                        avatar: `https://i.pravatar.cc/100?u=${email}`
                    });

                    socket.emit("signup success");

                } catch (err) {
                    console.error("❌ Signup error:", err);
                    socket.emit("auth error", "Signup failed");
                }
            });

            // =====================================
            // 🔐 LOGIN (FINAL FIXED)
            // =====================================
            socket.on("login", async ({ email, password, avatar }) => {

                console.log("📥 Login:", email);

                try {
                    if (!email || !password) {
                        socket.emit("auth error", "Enter email & password");
                        return;
                    }

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

                    // ✅ SAVE USER
                    users[socket.id] = {
                        name: user.name,
                        avatar: avatar || user.avatar
                    };

                    // ✅ SEND SUCCESS
                    socket.emit("login success", {
                        name: user.name,
                        avatar: avatar || user.avatar
                    });

                    // ✅🔥 AUTO JOIN (MAIN FIX)
                    const msg = {
                        name: "System",
                        message: `${user.name} joined the chat`,
                        time: new Date().toLocaleTimeString()
                    };

                    messages.push(msg);
                    await messageCollection.insertOne(msg);

                    io.emit("chat message", msg);
                    io.emit("user list", Object.values(users));
                    io.emit("user count", Object.keys(users).length);

                } catch (err) {
                    console.error("❌ Login error:", err);
                    socket.emit("auth error", "Login failed");
                }
            });

            // =====================================
            // ❌ JOIN DISABLED (FIX)
            // =====================================
            // socket.on("join", ...) ❌ REMOVE THIS

            // =====================================
            // 💬 MESSAGE
            // =====================================
            socket.on("chat message", async (data) => {
                try {
                    if (!data || !data.message) return;

                    const now = Date.now();

                    if (
                        lastMessageTime[socket.id] &&
                        now - lastMessageTime[socket.id] < 800
                    ) return;

                    lastMessageTime[socket.id] = now;

                    const user = users[socket.id];

                    let safeMessage;

                    if (typeof data.message === "object") {
                        safeMessage = data.message;
                    } else {
                        safeMessage = clean(data.message);
                    }

                    const msgData = {
                        name: user?.name || "Guest",
                        avatar: user?.avatar,
                        message: safeMessage,
                        time: new Date().toLocaleTimeString()
                    };

                    messages.push(msgData);
                    if (messages.length > 100) messages.shift();

                    await messageCollection.insertOne(msgData);

                    io.emit("chat message", msgData);

                } catch (err) {
                    console.error("❌ Message error:", err);
                }
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
                        message: `${user.name} left the chat`,
                        time: new Date().toLocaleTimeString()
                    };

                    messages.push(msg);
                    await messageCollection.insertOne(msg);

                    io.emit("chat message", msg);

                    delete users[socket.id];
                    delete lastMessageTime[socket.id];

                    io.emit("user list", Object.values(users));
                    io.emit("user count", Object.keys(users).length);
                }

                console.log("❌ Disconnected:", socket.id);
            });
        });

    } catch (err) {
        console.error("❌ MongoDB Error:", err);
    }
}

startServer();

// =====================================
// 🚀 ROUTE
// =====================================
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// =====================================
// 🚀 SERVER
// =====================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});