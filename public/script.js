const socket = io();

// 🔔 SOUND (optimized)
const msgSound = new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3");

// =====================================
// 🔥 GLOBAL STATE
// =====================================
let username = localStorage.getItem("username");
let avatar = localStorage.getItem("avatar");
let typingTimeout;
let isTyping = false;

// =====================================
// 🔥 AUTO LOGIN (NEW)
// =====================================
window.onload = () => {
    if (username) {
        document.getElementById("login").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");

        socket.emit("join", { name: username, avatar });
    }
};

// =====================================
// 🔥 AVATAR SELECT
// =====================================
function selectAvatar(img) {
    document.querySelectorAll(".avatar-select img").forEach(i => i.classList.remove("selected"));
    img.classList.add("selected");
    avatar = img.src;
}

// =====================================
// 🔥 START CHAT
// =====================================
function startChat() {
    const nameInput = document.getElementById("name").value.trim();

    if (!nameInput) {
        alert("Enter name!");
        return;
    }

    username = nameInput.substring(0, 20);
    avatar = avatar || "https://i.pravatar.cc/100";

    localStorage.setItem("username", username);
    localStorage.setItem("avatar", avatar);

    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    socket.emit("join", { name: username, avatar });
}

// =====================================
// 🔥 SEND MESSAGE
// =====================================
function send() {
    const input = document.getElementById("msg");
    const msg = input.value.trim();

    if (!msg) return;

    if (msg.length > 200) {
        alert("Max 200 characters!");
        return;
    }

    socket.emit("chat message", { message: msg });

    input.value = "";
    stopTyping();
    document.getElementById("emoji-picker").classList.add("hidden");
}

// =====================================
// 🔥 RENDER MESSAGE (UPGRADED)
// =====================================
function renderMessage(data) {
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

            // 🔔 play only if tab active
            if (!document.hidden) {
                msgSound.play().catch(() => {});
            }
        }

        div.appendChild(nameTag);
        div.appendChild(document.createTextNode(data.message));
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// =====================================
// 🔥 SOCKET EVENTS
// =====================================
socket.on("chat message", renderMessage);

socket.on("chat history", (msgs) => {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";
    msgs.forEach(renderMessage);
});

// =====================================
// ✍️ TYPING SYSTEM (ADVANCED)
// =====================================
const msgInput = document.getElementById("msg");

msgInput.addEventListener("input", () => {
    if (!isTyping) {
        socket.emit("typing", username);
        isTyping = true;
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, 1200);
});

function stopTyping() {
    isTyping = false;
}

socket.on("typing", (name) => {
    if (name === username) return;

    const box = document.getElementById("typing");
    box.innerText = name + " is typing...";

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        box.innerText = "";
    }, 1500);
});

// =====================================
// 👥 USER LIST
// =====================================
socket.on("user list", (users) => {
    const list = document.getElementById("userList");
    list.innerHTML = "";

    users.forEach(u => {
        const div = document.createElement("div");

        div.innerHTML = `
            <img src="${u.avatar}" width="30" style="border-radius:50%; margin-right:8px;">
            ${u.name}
        `;

        list.appendChild(div);
    });
});

// =====================================
// 👥 USER COUNT
// =====================================
socket.on("user count", (count) => {
    document.getElementById("status").innerText = "🟢 Online: " + count;
});

// =====================================
// 😀 EMOJI SYSTEM
// =====================================
function toggleEmoji() {
    document.getElementById("emoji-picker").classList.toggle("hidden");
}

function addEmoji(e) {
    const input = document.getElementById("msg");
    input.value += e;
    input.focus();
}

// click outside = close emoji
document.addEventListener("click", (e) => {
    const picker = document.getElementById("emoji-picker");
    if (picker && !picker.contains(e.target) && e.target.innerText !== "😊") {
        picker.classList.add("hidden");
    }
});

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
// ⌨️ ENTER KEY
// =====================================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("msg").addEventListener("keypress", (e) => {
        if (e.key === "Enter") send();
    });

    document.getElementById("name").addEventListener("keypress", (e) => {
        if (e.key === "Enter") startChat();
    });
});

// =====================================
// 🌐 ONLINE / OFFLINE DETECT
// =====================================
window.addEventListener("offline", () => {
    document.getElementById("status").innerText = "🔴 Offline";
});

window.addEventListener("online", () => {
    document.getElementById("status").innerText = "🟢 Online";
});