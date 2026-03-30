const socket = io();

// 🔔 MESSAGE SOUND
const msgSound = new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3");

// =====================================
// 1. USERNAME SETUP (🔥 SECURITY ADDED)
// =====================================
let username = localStorage.getItem("username");

if (!username) {
    username = prompt("Enter your name:");

    if (!username || username.trim() === "") {
        username = "Guest" + Math.floor(Math.random() * 1000);
    }

    username = username.trim();
}

// 🔥 Security: हैकर बहुत बड़ा नाम न रख सके (Max 20 chars)
if (username.length > 20) {
    username = username.substring(0, 20);
}
localStorage.setItem("username", username);

socket.emit("join", username);

// =====================================
// 2. SEND MESSAGE (🔥 SPAM CONTROL)
// =====================================
function send() {
    const msgInput = document.getElementById("msg");
    const msg = msgInput.value.trim();

    if (!msg) return;

    // 🔥 Spam Control: बहुत बड़ा मैसेज भेजकर कोई सर्वर डाउन न कर दे (Max 200 chars)
    if (msg.length > 200) {
        alert("मैसेज बहुत बड़ा है! कृपया 200 अक्षरों से कम का मैसेज भेजें।");
        return; 
    }

    socket.emit("chat message", {
        name: username,
        message: msg
    });

    msgInput.value = "";

    // 👇 emoji picker auto close
    document.getElementById("emoji-picker").classList.add("hidden");
}

// =====================================
// 3. RECEIVE MESSAGE (🔥 XSS PROTECTION)
// =====================================
socket.on("chat message", function(data) {
    const chat = document.getElementById("chat");
    const div = document.createElement("div");

    div.classList.add("message");

    if (data.name === "System") {
        div.classList.add("system");
        div.textContent = data.message; // 🔥 innerHTML की जगह textContent (सुरक्षित)
    }
    else {
        const nameTag = document.createElement("b");
        
        if (data.name === username) {
            div.classList.add("you");
            nameTag.textContent = "You: ";
        } else {
            div.classList.add("other");
            nameTag.textContent = `${data.name}: `;
            
            // 🔔 sound for others
            msgSound.play().catch(e => console.log("Sound autoplay blocked by browser"));
        }
        
        div.appendChild(nameTag);
        div.appendChild(document.createTextNode(data.message)); // 🔥 हैकर का कोड भी नॉर्मल टेक्स्ट बन जाएगा
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});

// ENTER KEY
document.getElementById("msg").addEventListener("keypress", function(e) {
    if (e.key === "Enter") send();
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
    const picker = document.getElementById("emoji-picker");
    picker.classList.toggle("hidden");
}

loadEmojis();


// =====================================
// 🌌 BACKGROUND AUTO CHANGE (SMOOTH)
// =====================================

const images = document.querySelectorAll(".bg-slider img");
let index = 0;

setInterval(() => {
    images[index].classList.remove("active");

    index = (index + 1) % images.length;

    images[index].classList.add("active");
}, 8000); // slow = premium feel