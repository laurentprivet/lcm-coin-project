const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(express.json());

// ================= DATABASE =================
mongoose.connect("mongodb+srv://laurentcity:police1234@cluster0.i3e40ch.mongodb.net/?appName=Cluster0")
.then(() => console.log("MongoDB connected ✅"))
.catch(err => console.log("DB error:", err));

// ================= USER MODEL =================
const userSchema = new mongoose.Schema({
    name: String,
    username: String,
    email: String,
    password: String,
    referral: String,

    coins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    lastMine: { type: Date, default: null }
});

const User = mongoose.model("User", userSchema);

// ================= REGISTER =================
app.post("/register", async (req, res) => {
    try {
        const { name, username, email, password, referral } = req.body;

        const exists = await User.findOne({ username });
        if (exists) return res.send("User already exists ❌");

        const user = new User({
            name,
            username,
            email,
            password,
            referral
        });

        await user.save();
        res.send("Registered successfully ✅");

    } catch (err) {
        res.send("Register error ❌");
    }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            return res.json({ message: "User not found ❌" });
        }

        if (user.password !== password) {
            return res.json({ message: "Wrong password ❌" });
        }

        res.json({
            message: "Login successful ✅",
            username: user.username,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {
        res.json({ message: "Login error ❌" });
    }
});

// ================= MINE (24H COOLDOWN) =================
app.post("/mine", async (req, res) => {
    const user = await User.findOne({ username: req.body.username });

    if (!user) return res.send("User not found ❌");

    const now = new Date();
    const cooldown = 24 * 60 * 60 * 1000;

    if (user.lastMine && (now - user.lastMine < cooldown)) {
        const remaining = cooldown - (now - user.lastMine);
        const hours = Math.floor(remaining / (1000 * 60 * 60));

        return res.json({
            message: `⏳ Try again after ${hours}h`,
            coins: user.coins,
            level: user.level
        });
    }

    const reward = user.level;

    user.coins += reward;
    user.lastMine = now;

    await user.save();

    res.json({
        message: `You mined ${reward} LCM ⛏️`,
        coins: user.coins,
        level: user.level
    });
});

// ================= FIXED: MINE TIME LEFT =================
app.post("/mine-time-left", async (req, res) => {

    const user = await User.findOne({ username: req.body.username });

    if (!user || !user.lastMine) {
        return res.json({ remaining: 0 });
    }

    const now = new Date();
    const cooldown = 24 * 60 * 60 * 1000;

    const diff = now - user.lastMine;

    if (diff >= cooldown) {
        return res.json({ remaining: 0 });
    }

    const remainingMs = cooldown - diff;

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    res.json({
        remaining: `${hours}h ${minutes}m`
    });
});

// ================= UPGRADE =================
app.post("/upgrade", async (req, res) => {

    const user = await User.findOne({ username: req.body.username });

    if (!user) return res.send("User not found ❌");

    const cost = user.level * 10;

    if (user.coins < cost) {
        return res.send("Not enough coins ❌");
    }

    user.coins -= cost;
    user.level += 1;

    await user.save();

    res.json({
        message: "Level upgraded 🚀",
        coins: user.coins,
        level: user.level
    });
});

// ================= AUTO LOGIN =================
app.post("/auto-login", async (req, res) => {

    const user = await User.findOne({ username: req.body.username });

    if (!user) {
        return res.json({ ok: false });
    }

    res.json({
        ok: true,
        username: user.username,
        coins: user.coins,
        level: user.level
    });
});

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log("LCM running on http://localhost:3000");
});