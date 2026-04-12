// ✅ SINGLE SOCKET (FINAL FIX)
window.socket = io();
const socket = window.socket;

// 🔔 SOUND (SAFE PLAY)
const msgSound = new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3");

// =====================================
// 🔥 GLOBAL STATE
// =====================================
const state = {
    username: localStorage.getItem("username"),
    avatar: localStorage.getItem("avatar"),
    isTyping: false,
    joined: false,
    lastSent: 0,
    lastSender: null
};

let typingTimeout;

// =====================================
// 🚀 INIT
// =====================================
document.addEventListener("DOMContentLoaded", () => {

    if (state.username && state.avatar) {
        showApp();
        joinServer();
    }

    const msgInput = document.getElementById("msg");

    msgInput?.addEventListener("input", () => {
        if (!state.isTyping && state.username) {
            socket.emit("typing", state.username);
            state.isTyping = true;
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(stopTyping, 1200);
    });

    msgInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") send();
    });
});

// =====================================
// 🔁 RECONNECT
// =====================================
socket.on("connect", () => {
    console.log("🔌 Connected:", socket.id);

    if (state.username && state.avatar) {
        state.joined = false;
        joinServer();
    }
});

// =====================================
// 🔥 UI SWITCH
// =====================================
function showApp() {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    document.getElementById("me").innerHTML = `
        <img src="${state.avatar}" width="25" style="border-radius:50%">
        ${state.username}
    `;
}

// =====================================
// 🔥 JOIN SERVER
// =====================================
function joinServer() {
    if (!state.joined && state.username) {
        console.log("🚀 Joining server...");
        socket.emit("join", { name: state.username, avatar: state.avatar });
        state.joined = true;
    }
}

// =====================================
// 🔐 LOGIN
// =====================================
function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    console.log("🚀 LOGIN CLICKED");

    if (!email || !password) return showAuth("❌ Fill all fields");

    socket.emit("login", {
        email,
        password,
        avatar: window.selectedAvatar || state.avatar
    });
}

// =====================================
// 🔐 SIGNUP
// =====================================
function signup() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const name = "User_" + Math.floor(Math.random() * 1000);

    if (!email || !password) return showAuth("❌ Fill all fields");

    socket.emit("signup", { name, email, password });
}

// =====================================
// 🔐 AUTH UI
// =====================================
function showAuth(msg) {
    document.getElementById("authMsg").innerText = msg;
}

// =====================================
// 🔐 AUTH EVENTS (FINAL FIX)
// =====================================
socket.on("login success", (user) => {

    console.log("✅ LOGIN SUCCESS RECEIVED", user);

    state.username = user.name;
    state.avatar = user.avatar;

    localStorage.setItem("username", state.username);
    localStorage.setItem("avatar", state.avatar);

    // 🔥 BUTTON RESET
    const btn = document.getElementById("loginBtn");
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Login";
    }

    // 🔥 UI SWITCH
    showApp();

    // ✅🔥 FINAL FIX (IMPORTANT)
    state.joined = false; // reset
    joinServer();         // force join
});

socket.on("signup success", () => {
    showAuth("✅ Signup success! Login now.");
});

socket.on("auth error", (msg) => {
    console.log("❌ AUTH ERROR:", msg);

    showAuth("❌ " + msg);

    const btn = document.getElementById("loginBtn");
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Login";
    }
});

// =====================================
// 🔓 LOGOUT
// =====================================
function logout() {
    localStorage.clear();
    location.reload();
}

// =====================================
// 💬 SEND MESSAGE
// =====================================
function send() {
    const input = document.getElementById("msg");
    const msg = input.value.trim();

    if (!msg) return;
    if (msg.length > 200) return;

    const now = Date.now();
    if (now - state.lastSent < 800) return;

    state.lastSent = now;

    socket.emit("chat message", { message: msg });

    input.value = "";
    input.focus();
    stopTyping();
}

// =====================================
// 🖼️ IMAGE SEND
// =====================================
function sendImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("Max 2MB allowed");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        socket.emit("chat message", {
            message: { type: "image", src: reader.result }
        });
    };

    reader.readAsDataURL(file);
}

// =====================================
// 🔔 NOTIFICATION
// =====================================
function showNotification() {
    const notif = document.getElementById("notif");
    notif?.classList.remove("hidden");
}

// =====================================
// 💬 RENDER MESSAGE
// =====================================
function renderMessage(data) {
    const chat = document.getElementById("chat");

    const isNearBottom =
        chat.scrollTop + chat.clientHeight >= chat.scrollHeight - 50;

    const div = document.createElement("div");
    div.classList.add("message");

    if (data.name === "System") {
        div.classList.add("system");
        div.textContent = data.message;
        state.lastSender = null;
    } else {

        const isYou = data.name === state.username;
        div.classList.add(isYou ? "you" : "other");

        if (!isYou) {
            if (!document.hidden) {
                msgSound.currentTime = 0;
                msgSound.play().catch(() => {});
            } else {
                showNotification();
            }
        }

        if (state.lastSender !== data.name) {
            const nameTag = document.createElement("b");
            nameTag.textContent = isYou ? "You: " : `${data.name}: `;
            div.appendChild(nameTag);
            state.lastSender = data.name;
        }

        if (typeof data.message === "object" && data.message.type === "image") {

            if (data.message.src?.startsWith("data:image/")) {
                const img = document.createElement("img");
                img.src = data.message.src;
                img.style.maxWidth = "150px";
                img.style.borderRadius = "8px";
                div.appendChild(img);
            }

        } else {
            const span = document.createElement("span");
            span.textContent = data.message;
            div.appendChild(span);
        }

        if (data.time) {
            const time = document.createElement("div");
            time.style.fontSize = "10px";
            time.style.opacity = "0.6";
            time.textContent = data.time;
            div.appendChild(time);
        }
    }

    chat.appendChild(div);

    if (chat.children.length > 150) {
        chat.removeChild(chat.firstChild);
    }

    if (isNearBottom) {
        chat.scrollTop = chat.scrollHeight;
    }
}

// =====================================
// 🔥 SOCKET EVENTS
// =====================================
socket.on("chat message", renderMessage);

socket.on("chat history", (msgs) => {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";
    state.lastSender = null;
    msgs.forEach(renderMessage);
});

// =====================================
// ✍️ TYPING
// =====================================
function stopTyping() {
    if (state.isTyping && state.username) {
        socket.emit("stop typing", state.username);
        state.isTyping = false;
    }
}

socket.on("typing", (name) => {
    if (name === state.username) return;

    const box = document.getElementById("typing");
    box.innerText = name + " is typing...";

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        box.innerText = "";
    }, 1500);
});

// =====================================
// 👥 USERS
// =====================================
socket.on("user list", (users) => {
    const list = document.getElementById("userList");
    list.innerHTML = "";

    users.forEach(u => {
        const div = document.createElement("div");

        const img = document.createElement("img");
        img.src = u.avatar;
        img.width = 30;
        img.style.borderRadius = "50%";

        div.appendChild(img);
        div.append(" " + u.name);

        list.appendChild(div);
    });
});

// =====================================
// 👥 COUNT
// =====================================
socket.on("user count", (count) => {
    document.getElementById("status").innerText = "🟢 Online: " + count;
});

// =====================================
// 😀 EMOJI
// =====================================
function toggleEmoji() {
    document.getElementById("emoji-picker").classList.toggle("hidden");
}

function addEmoji(e) {
    const input = document.getElementById("msg");
    input.value += e;
    input.focus();
}

// =====================================
// 🌙 THEME
// =====================================
function toggleTheme() {
    document.body.classList.toggle("light");
}

// =====================================
// 🌐 NETWORK
// =====================================
window.addEventListener("offline", () => {
    document.getElementById("status").innerText = "🔴 Offline";
});

window.addEventListener("online", () => {
    document.getElementById("status").innerText = "🟢 Online";
});