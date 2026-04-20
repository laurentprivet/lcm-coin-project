const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// ================= SAFE HANDLERS =================
process.on("uncaughtException", (err) => {
    console.log("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.log("❌ Unhandled Rejection:", err);
});

// ================= PORT =================
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(express.static("public"));
app.use(express.json());

// ================= MONGODB =================
mongoose.connect("mongodb+srv://laurentcity:police1234@cluster0.i3e40ch.mongodb.net/?retryWrites=true&w=majority")
.then(() => console.log("MongoDB connected ✅"))
.catch(err => console.log("MongoDB error ❌", err));

// ================= USER SCHEMA =================
const userSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true },
    email: String,
    password: String,

    referralCode: { type: String, unique: true },
    referredBy: String,
    referrals: { type: [String], default: [] },

    coins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    lastMine: { type: Date, default: null },
    totalMined: { type: Number, default: 0 }
});

const User = mongoose.model("User", userSchema);

// ================= REF CODE =================
function generateReferralCode(username) {
    return username + Math.floor(1000 + Math.random() * 9000);
}

// ================= ROUTES =================

// Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});

// ================= REGISTER =================
app.post("/register", async (req, res) => {
    try {
        const { name, username, email, password, referral } = req.body;

        if (!username || !password) {
            return res.json({ message: "Missing fields ❌" });
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.json({ message: "User already exists ❌" });
        }

        let refUser = null;
        if (referral) {
            refUser = await User.findOne({ referralCode: referral });
        }

        let referralCode = generateReferralCode(username);
        while (await User.findOne({ referralCode })) {
            referralCode = generateReferralCode(username);
        }

        const newUser = new User({
            name,
            username,
            email,
            password,
            referralCode,
            referredBy: referral || null,
            referrals: []
        });

        await newUser.save();

        // reward referrer
        if (refUser) {
            refUser.coins += 5;
            refUser.totalMined += 5;
            refUser.referrals.push(username);
            await refUser.save();
        }

        res.json({
            message: "Registered successfully ✅",
            referralCode
        });

    } catch (err) {
        console.log(err);
        res.json({ message: "Register error ❌" });
    }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user || user.password !== password) {
            return res.json({ message: "Wrong username or password ❌" });
        }

        res.json({
            message: "Login successful ✅",
            username: user.username,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {
        res.json({ message: "Server error ❌" });
    }
});

// ================= AUTO LOGIN =================
app.post("/auto-login", async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });

        if (!user) return res.json({ ok: false });

        res.json({
            ok: true,
            username: user.username,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {
        res.json({ ok: false });
    }
});

// ================= USER INFO =================
app.post("/user-info", async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });

        if (!user) return res.json({ message: "User not found ❌" });

        res.json({
            referralCode: user.referralCode,
            referrals: user.referrals.length,
            referralEarnings: user.referrals.length * 5
        });

    } catch (err) {
        res.json({ message: "Error ❌" });
    }
});

// ================= MINE =================
app.post("/mine", async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) return res.json({ message: "User not found ❌" });

        const now = Date.now();
        const cooldown = 10 * 1000; // 10 sec test (you can increase later)

        if (user.lastMine && now - user.lastMine < cooldown) {
            const remaining = Math.ceil((cooldown - (now - user.lastMine)) / 1000);
            return res.json({ message: "Wait cooldown ❌", coins: user.coins, level: user.level, remaining });
        }

        const reward = user.level * 2;

        user.coins += reward;
        user.totalMined += reward;
        user.lastMine = now;

        await user.save();

        res.json({
            message: `Mined +${reward} LCM ✅`,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {
        res.json({ message: "Mine error ❌" });
    }
});

// ================= UPGRADE =================
app.post("/upgrade", async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) return res.json({ message: "User not found ❌" });

        const cost = user.level * 10;

        if (user.coins < cost) {
            return res.json({ message: "Not enough coins ❌" });
        }

        user.coins -= cost;
        user.level += 1;

        await user.save();

        res.json({
            message: "Upgraded successfully ⬆️",
            coins: user.coins,
            level: user.level
        });

    } catch (err) {
        res.json({ message: "Upgrade error ❌" });
    }
});

// ================= SERVER START =================
app.listen(PORT, () => {
    console.log(`LCM running on port ${PORT} 🚀`);
});