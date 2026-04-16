const express = require("express");
const mongoose = require("mongoose");

const app = express();

// ================= SAFE HANDLERS =================
process.on("uncaughtException", (err) => {
    console.log("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.log("❌ Unhandled Rejection:", err);
});

// ================= PORT (RENDER FIX) =================
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(express.static("public"));
app.use(express.json());

// ================= ROOT ROUTE (FIX HELLO WORLD) =================
app.get("/", (req, res) => {
    res.send("⛏️ LCM Mining App is Running 🚀");
});

// ================= MONGODB =================
mongoose.connect("mongodb+srv://laurentcity:police1234@cluster0.i3e40ch.mongodb.net/?retryWrites=true&w=majority")
.then(() => console.log("MongoDB connected ✅"))
.catch(err => console.log("MongoDB error ❌", err));

// ================= USER SCHEMA =================
const userSchema = new mongoose.Schema({
    name: String,
    username: String,
    email: String,
    password: String,
    referralCode: String,
    referredBy: String,
    coins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastMine: { type: Date, default: null }
});

const User = mongoose.model("User", userSchema);

// ================= REGISTER =================
app.post("/register", async (req, res) => {
    try {
        const { name, username, email, password, referral } = req.body;

        if (!username || !password) {
            return res.send("Missing fields ❌");
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.send("User already exists ❌");
        }

        const referralCode = username + Math.floor(Math.random() * 1000);

        const newUser = new User({
            name,
            username,
            email,
            password,
            referralCode,
            referredBy: referral,
            coins: 0,
            level: 1
        });

        await newUser.save();

        res.send("Registered successfully ✅");

    } catch (err) {
        console.log(err);
        res.send("Register error ❌");
    }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
    console.log("LOGIN HIT"); // 🔍 Debug: check if request reaches server

    try {
        const { username, password } = req.body;

        // 🔒 Basic validation
        if (!username || !password) {
            return res.json({
                message: "Please enter username and password ❌"
            });
        }

        const user = await User.findOne({ username });

        // ❌ WRONG USERNAME OR PASSWORD (same message)
        if (!user || user.password !== password) {
            return res.json({
                message: "Wrong password (check your username or password) ❌"
            });
        }

        // ✅ SUCCESS
        return res.json({
            message: "Login successful ✅",
            username: user.username,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {
        console.log("LOGIN ERROR:", err);

        return res.json({
            message: "Server error ❌"
        });
    }
});

// ================= MINE =================
app.post("/mine", async (req, res) => {
    try {
        const { username } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.send("User not found ❌");

        const now = new Date();

        if (user.lastMine) {
            const diff = now - user.lastMine;
            const hours = diff / (1000 * 60 * 60);

            if (hours < 24) {
                return res.json({
                    message: "⛔ Mining locked",
                    coins: user.coins,
                    level: user.level
                });
            }
        }

        const reward = user.level || 1;
        user.coins += reward;
        user.lastMine = now;

        await user.save();

        res.json({
            message: `You mined ${reward} LCM ⛏️`,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {
        res.send("Mine error ❌");
    }
});

// ================= TIME LEFT =================
app.post("/mine-time-left", async (req, res) => {
    try {
        const { username } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.send("User not found ❌");

        if (!user.lastMine) {
            return res.json({ remaining: 0 });
        }

        const now = new Date();
        const diff = now - user.lastMine;

        if (diff >= 24 * 60 * 60 * 1000) {
            return res.json({ remaining: 0 });
        }

        const remainingMs = (24 * 60 * 60 * 1000) - diff;

        const h = Math.floor(remainingMs / (1000 * 60 * 60));
        const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

        res.json({
            remaining: `${h}h ${m}m`
        });

    } catch (err) {
        res.json({ remaining: "error" });
    }
});

// ================= UPGRADE =================
app.post("/upgrade", async (req, res) => {
    try {
        const { username } = req.body;

        const user = await User.findOne({ username });
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

    } catch (err) {
        res.send("Upgrade error ❌");
    }
});
// ================= START SERVER (RENDER FIX) =================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`LCM running on port ${PORT}`);
});