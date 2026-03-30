const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// ✅ USERS STORE
let users = {};

io.on("connection", (socket) => {
    console.log("User connected");

    // ✅ JOIN EVENT
    socket.on("join", (username) => {
        users[socket.id] = username;

        io.emit("chat message", {
            name: "System",
            message: username + " joined the chat"
        });
    });

    // ✅ CHAT MESSAGE
    socket.on("chat message", (data) => {
        io.emit("chat message", data);
    });

    // ✅ DISCONNECT
    socket.on("disconnect", () => {
        if (users[socket.id]) {
            io.emit("chat message", {
                name: "System",
                message: users[socket.id] + " left the chat"
            });

            delete users[socket.id];
        }

        console.log("User disconnected");
    });
});

// ✅ SERVER START
server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});