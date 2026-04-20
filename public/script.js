
let currentUser = "";
let countdownInterval = null;

// ================= SAFE ELEMENT =================
function el(id) {
    return document.getElementById(id);
}

// ================= MESSAGE =================
function showMessage(text, color = "black") {
    const msg = el("message");
    if (!msg) return;
    msg.innerText = text;
    msg.style.color = color;
}

// ================= REGISTER =================
function register() {
    const name = el("reg_name")?.value || "";
    const username = el("reg_username")?.value || "";
    const email = el("reg_email")?.value || "";
    const password = el("reg_password")?.value || "";
    const referral = el("reg_referral")?.value || "";

    fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, password, referral })
    })
    .then(r => r.json())
    .then(d => {
        showMessage(d.message, "green");
    })
    .catch(() => {
        showMessage("Register error ❌", "red");
    });
}

// ================= LOGIN =================
function login(event) {
    if (event) event.preventDefault(); // 🔥 FIX CURSOR BUG

    const username = el("username")?.value || "";
    const password = el("password")?.value || "";

    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {

        if (!data.username) {
            showMessage(data.message, "red");
            el("password").value = "";
            el("password").focus();
            return;
        }

        currentUser = data.username;
        localStorage.setItem("lcmUser", currentUser);

        el("authSection").style.display = "none";
        el("dashboard").style.display = "block";

        el("balance").innerText = data.coins || 0;
        el("level").innerText = data.level || 1;

        showMessage(data.message, "green");

        loadReferralData(currentUser);
        startLiveCountdown();
    })
    .catch(() => {
        showMessage("Network error ❌", "red");
    });
}

// ================= LOAD REFERRAL =================
function loadReferralData(username) {
    fetch("/user-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
    })
    .then(r => r.json())
    .then(data => {

        el("refCount").innerText = data.referrals || 0;
        el("refEarn").innerText = data.referralEarnings || 0;

        const link = window.location.origin + "/register?ref=" + (data.referralCode || "");
        el("refLink").value = link;
    })
    .catch(() => {
        console.log("Referral load error");
    });
}

// ================= COPY LINK =================
function copyLink() {
    const input = el("refLink");
    if (!input) return;

    input.select();
    document.execCommand("copy");

    alert("Referral link copied ✅");
}

// ================= MINE =================
function mine() {
    if (!currentUser) return;

    fetch("/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
    })
    .then(r => r.json())
    .then(d => {

        showMessage(d.message, "green");

        if (d.coins !== undefined) el("balance").innerText = d.coins;
        if (d.level !== undefined) el("level").innerText = d.level;
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

        showMessage(d.message, "green");

        if (d.coins !== undefined) el("balance").innerText = d.coins;
        if (d.level !== undefined) el("level").innerText = d.level;
    });
}

// ================= COUNTDOWN =================
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

            const cooldown = el("cooldown");
            const mineBtn = el("mineBtn");

            if (!cooldown || !mineBtn) return;

            const remaining = d.remaining ?? 0;

            if (remaining === 0) {
                cooldown.innerText = "⛏️ Ready to mine!";
                mineBtn.disabled = false;
            } else {
                const hours = Math.floor(remaining / 3600);
const minutes = Math.floor((remaining % 3600) / 60);
const seconds = remaining % 60;

cooldown.innerText =
    `⏳ ${hours}h ${minutes}m ${seconds}s`;
                mineBtn.disabled = true;
            }

        })
        .catch(() => {
            const cooldown = el("cooldown");
            if (cooldown) cooldown.innerText = "❌ Cannot load time";
        });

    }, 1000);
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

                el("authSection").style.display = "none";
                el("dashboard").style.display = "block";

                el("balance").innerText = d.coins || 0;
                el("level").innerText = d.level || 1;

                loadReferralData(currentUser);
                startLiveCountdown();
            }
        });
    }
};