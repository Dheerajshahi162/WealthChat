const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// USERS STORE
let users = {};

io.on("connection", (socket) => {
    console.log("User connected");

    socket.on("join", (username) => {
        users[socket.id] = username;

        io.emit("chat message", {
            name: "System",
            message: username + " joined the chat"
        });
    });

    socket.on("chat message", (data) => {
        io.emit("chat message", data);
    });

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

// ✅ IMPORTANT FIX
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});