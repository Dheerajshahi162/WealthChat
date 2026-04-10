const socket = io();

// 🔔 MESSAGE SOUND
const msgSound = new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3");

// =====================================
// 🔥 1. USERNAME AUTO (NO POPUP)
// =====================================
let username = localStorage.getItem("username");

if (!username) {
    username = "User" + Math.floor(Math.random() * 10000);
    localStorage.setItem("username", username);
}

// limit
if (username.length > 20) {
    username = username.substring(0, 20);
}

socket.emit("join", username);

// =====================================
// 🔥 2. SEND MESSAGE
// =====================================
function send() {
    const msgInput = document.getElementById("msg");
    const msg = msgInput.value.trim();

    if (!msg) return;

    if (msg.length > 200) {
        alert("Max 200 characters allowed!");
        return;
    }

    socket.emit("chat message", {
        message: msg
    });

    msgInput.value = "";

    document.getElementById("emoji-picker").classList.add("hidden");
}

// =====================================
// 🔥 3. RECEIVE MESSAGE (SAFE)
// =====================================
socket.on("chat message", function(data) {
    const chat = document.getElementById("chat");
    const div = document.createElement("div");

    div.classList.add("message");

    if (data.name === "System") {
        div.classList.add("system");
        div.textContent = data.message;
    } else {
        const nameTag = document.createElement("b");

        if (data.name === username) {
            div.classList.add("you");
            nameTag.textContent = "You: ";
        } else {
            div.classList.add("other");
            nameTag.textContent = `${data.name}: `;
            msgSound.play().catch(() => {});
        }

        div.appendChild(nameTag);
        div.appendChild(document.createTextNode(data.message));
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});

// =====================================
// 🔥 4. CHAT HISTORY (NEW)
// =====================================
socket.on("chat history", function(msgs) {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";

    msgs.forEach(data => {
        const div = document.createElement("div");
        div.classList.add("message");

        if (data.name === username) {
            div.classList.add("you");
            div.innerHTML = `<b>You:</b> ${data.message}`;
        } else {
            div.classList.add("other");
            div.innerHTML = `<b>${data.name}:</b> ${data.message}`;
        }

        chat.appendChild(div);
    });

    chat.scrollTop = chat.scrollHeight;
});

// =====================================
// ✍️ 5. TYPING INDICATOR
// =====================================
document.getElementById("msg").addEventListener("input", () => {
    socket.emit("typing");
});

socket.on("typing", function(name) {
    const typingBox = document.getElementById("typing");

    typingBox.innerText = name + " is typing...";

    setTimeout(() => {
        typingBox.innerText = "";
    }, 1000);
});

// =====================================
// 👥 6. USER COUNT
// =====================================
socket.on("user count", function(count) {
    const userBox = document.getElementById("users");
    userBox.innerText = "👥 Online: " + count;
});

// =====================================
// 😀 EMOJI SYSTEM
// =====================================
const emojis = [
    "😀","😂","😍","😎","🔥","❤️","👍","🥳","😱","🤩",
    "😜","🤔","😴","😡","😭","😇","😉","🙃","😅","🤣"
];

function loadEmojis() {
    const container = document.getElementById("emoji-list");
    container.innerHTML = "";

    emojis.forEach(e => {
        const span = document.createElement("span");
        span.classList.add("emoji");
        span.innerText = e;

        span.onclick = () => {
            const input = document.getElementById("msg");
            input.value += e;
            input.focus();
        };

        container.appendChild(span);
    });
}

function toggleEmoji() {
    document.getElementById("emoji-picker").classList.toggle("hidden");
}

loadEmojis();

// =====================================
// 🌌 BACKGROUND SLIDER
// =====================================
const images = document.querySelectorAll(".bg-slider img");
let index = 0;

setInterval(() => {
    images[index].classList.remove("active");
    index = (index + 1) % images.length;
    images[index].classList.add("active");
}, 8000);

// =====================================
// ENTER KEY
// =====================================
document.getElementById("msg").addEventListener("keypress", function(e) {
    if (e.key === "Enter") send();
});