const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(express.static("public"));

// USERS STORE
let users = {};
let lastMessageTime = {};
let messages = []; // 🔥 CHAT HISTORY STORE

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // 🔥 SEND OLD MESSAGES WHEN USER JOINS
    socket.emit("chat history", messages);

    // ✅ JOIN EVENT
    socket.on("join", (username) => {
        if (!username || typeof username !== "string") return;

        username = username.trim().substring(0, 20);
        users[socket.id] = username;

        const joinMsg = {
            name: "System",
            message: `${username} joined the chat`
        };

        messages.push(joinMsg);

        io.emit("chat message", joinMsg);
    });

    // ✅ CHAT MESSAGE
    socket.on("chat message", (data) => {
        if (!data || typeof data.message !== "string") return;

        // 🔥 ANTI-SPAM
        const now = Date.now();
        if (lastMessageTime[socket.id] && now - lastMessageTime[socket.id] < 1000) {
            return;
        }
        lastMessageTime[socket.id] = now;

        const message = data.message.substring(0, 200);

        const messageData = {
            name: users[socket.id] || "Guest",
            message: message
        };

        // 💾 SAVE MESSAGE
        messages.push(messageData);

        // 🔥 LIMIT (last 100 messages)
        if (messages.length > 100) {
            messages.shift();
        }

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

            io.emit("chat message", leaveMsg);

            delete users[socket.id];
            delete lastMessageTime[socket.id];
        }

        console.log("User disconnected:", socket.id);
    });
});

// PORT FIX
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});