
let currentUser = "";
let countdownInterval = null;

// ================= OPEN REGISTER =================
function openRegister() {
    document.getElementById("registerModal").style.display = "block";
}

function closeRegister() {
    document.getElementById("registerModal").style.display = "none";
}

// ================= REGISTER =================
function register() {
    const name = document.getElementById("reg_name").value;
    const username = document.getElementById("reg_username").value;
    const email = document.getElementById("reg_email").value;
    const password = document.getElementById("reg_password").value;
    const referral = document.getElementById("reg_referral").value;

    fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password, referral })
    })
    .then(r => r.text())
    .then(d => {
        document.getElementById("message").innerText = d;
        closeRegister();
    })
    .catch(() => {
        document.getElementById("message").innerText = "Register error ❌";
    });
}

// ================= LOGIN =================
function login() {
    const username = document.getElementById("username").value;
    const passwordInput = document.getElementById("password");
    const password = passwordInput.value;

    const messageBox = document.getElementById("message");

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {

        console.log("LOGIN RESPONSE:", data);

        if (!data.username) {
            messageBox.innerText = data.message;
            messageBox.style.color = "red";

            passwordInput.value = "";
            passwordInput.focus();
            return;
        }

        currentUser = data.username;

        localStorage.setItem("lcmUser", currentUser);

        document.getElementById("authSection").style.display = "none";
        document.getElementById("dashboard").style.display = "block";

        document.getElementById("balance").innerText = data.coins;
        document.getElementById("level").innerText = data.level;

        messageBox.innerText = data.message;
        messageBox.style.color = "green";

        startLiveCountdown();
    })
    .catch(() => {
        messageBox.innerText = "Network error ❌";
        messageBox.style.color = "red";
    });
}

// ================= MINE (WITH ANIMATION) =================
function mine() {
    if (!currentUser) return;

    const coin = document.querySelector(".coin");

    // 🔥 coin animation effect
    if (coin) {
        coin.classList.add("mine-effect");

        setTimeout(() => {
            coin.classList.remove("mine-effect");
        }, 400);
    }

    fetch("/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
    })
    .then(r => r.json())
    .then(d => {
        document.getElementById("message").innerText = d.message;
        document.getElementById("balance").innerText = d.coins;
        document.getElementById("level").innerText = d.level;
    });
}

// ================= UPGRADE =================
function upgrade() {
    if (!currentUser) return;

    fetch("/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
    })
    .then(r => r.json())
    .then(d => {
        document.getElementById("message").innerText = d.message;
        document.getElementById("balance").innerText = d.coins;
        document.getElementById("level").innerText = d.level;
    });
}

// ================= LIVE COUNTDOWN =================
function startLiveCountdown() {

    if (!currentUser) return;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {

        fetch("/mine-time-left", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUser })
        })
        .then(r => r.json())
        .then(d => {

            const cooldown = document.getElementById("cooldown");
            const mineBtn = document.getElementById("mineBtn");

            if (!cooldown) return;

            const remaining = d.remaining ?? 0;

            if (remaining === 0) {
                cooldown.innerText = "⛏️ Ready to mine!";
                mineBtn.disabled = false;
            } else {
                cooldown.innerText = "⏳ " + remaining;
                mineBtn.disabled = true;
            }

        })
        .catch(() => {
            document.getElementById("cooldown").innerText =
                "❌ Cannot load time";
        });

    }, 1000);
}

// ================= CHECK TIME =================
function checkMineTime() {
    if (!currentUser) return;

    fetch("/mine-time-left", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
    })
    .then(r => r.json())
    .then(d => {
        document.getElementById("cooldown").innerText =
            d.remaining === 0 ? "⛏️ You can mine now!" : "⏳ " + d.remaining;
    });
}

// ================= LOGOUT =================
function logout() {
    localStorage.removeItem("lcmUser");
    location.reload();
}

// ================= AUTO LOGIN =================
window.onload = function () {

    const saved = localStorage.getItem("lcmUser");

    if (saved) {
        fetch("/auto-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: saved })
        })
        .then(r => r.json())
        .then(d => {

            if (d.ok) {
                currentUser = d.username;

                document.getElementById("authSection").style.display = "none";
                document.getElementById("dashboard").style.display = "block";

                document.getElementById("balance").innerText = d.coins;
                document.getElementById("level").innerText = d.level;

                startLiveCountdown();
            }
        });
    }
};