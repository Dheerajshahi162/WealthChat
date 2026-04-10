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
let lastMessageTime = {}; // 🔥 anti-spam

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (username) => {
        if (!username || typeof username !== "string") return;

        username = username.trim().substring(0, 20);
        users[socket.id] = username;

        io.emit("chat message", {
            name: "System",
            message: `${username} joined the chat`
        });
    });

    socket.on("chat message", (data) => {
        if (!data || !data.message) return;

        // 🔥 anti-spam (1 sec)
        const now = Date.now();
        if (lastMessageTime[socket.id] && now - lastMessageTime[socket.id] < 1000) {
            return;
        }
        lastMessageTime[socket.id] = now;

        const message = data.message.substring(0, 200);

        io.emit("chat message", {
            name: users[socket.id] || "Guest",
            message: message
        });
    });

    socket.on("disconnect", () => {
        if (users[socket.id]) {
            io.emit("chat message", {
                name: "System",
                message: `${users[socket.id]} left the chat`
            });

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