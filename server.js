const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const app = express();

// ================= ADMIN =================
const ADMIN = {
    username: "admin",
    password: "admin123"
};

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

    username: {
        type: String,
        unique: true
    },

    email: String,
    password: String,

    referralCode: {
        type: String,
        unique: true
    },

    referredBy: String,

    referrals: {
        type: [String],
        default: []
    },

    coins: {
        type: Number,
        default: 0
    },

    level: {
        type: Number,
        default: 1
    },

    lastMine: {
        type: Number,
        default: 0
    },

    totalMined: {
        type: Number,
        default: 0
    },

    lastActive: {
        type: Number,
        default: 0
    },

    // 🚫 BAN SYSTEM
    banned: {
        type: Boolean,
        default: false
    }

});

const User = mongoose.model("User", userSchema);
let globalAnnouncement = "🚀 Welcome to LCM Mining Platform";

// ================= REF CODE =================
function generateReferralCode(username) {
    return username + Math.floor(1000 + Math.random() * 9000);
}

// ================= ROUTES =================

// Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Register
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});

// Admin
app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ================= REGISTER =================
app.post("/register", async (req, res) => {

    try {

        const {
            name,
            username,
            email,
            password,
            referral
        } = req.body;

        if (!username || !password) {
            return res.json({
                message: "Missing fields ❌"
            });
        }

        const existing = await User.findOne({ username });

        if (existing) {
            return res.json({
                message: "User already exists ❌"
            });
        }

        let refUser = null;

        if (referral) {
            refUser = await User.findOne({
                referralCode: referral
            });
        }

        // Generate unique referral code
let referralCode = generateReferralCode(username);

while (await User.findOne({ referralCode })) {
    referralCode = generateReferralCode(username);
}

// 🔐 HASH PASSWORD
const hashedPassword = await bcrypt.hash(password, 10);

// Create user
const newUser = new User({
    name,
    username,
    email,

    // 🔐 SAVE ENCRYPTED PASSWORD
    password: hashedPassword,

    referralCode,
    referredBy: referral || null,

    referrals: [],

    lastActive: Date.now()
});

        await newUser.save();

        // Referral reward
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

        res.json({
            message: "Register error ❌"
        });

    }

});

// ================= LOGIN =================
app.post("/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        const user = await User.findOne({ username });

        // Wrong credentials
        if (!user) {
    return res.json({
        message: "Wrong username or password ❌"
    });
}

const validPassword = await bcrypt.compare(
    password,
    user.password
);

if (!validPassword) {
    return res.json({
        message: "Wrong username or password ❌"
    });
}

        // 🚫 BANNED USER
        if (user.banned) {
            return res.json({
                message: "Account banned 🚫"
            });
        }

        // Active user tracking
        user.lastActive = Date.now();

        await user.save();

        res.json({
            message: "Login successful ✅",
            username: user.username,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {

        console.log(err);

        res.json({
            message: "Server error ❌"
        });

    }

});

// ================= AUTO LOGIN =================
app.post("/auto-login", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.body.username
        });

        if (!user) {
            return res.json({
                ok: false
            });
        }

        if (user.banned) {
            return res.json({
                ok: false
            });
        }

        user.lastActive = Date.now();

        await user.save();

        res.json({
            ok: true,
            username: user.username,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {

        res.json({
            ok: false
        });

    }

});

// ================= ADMIN LOGIN =================
app.post("/admin-login", (req, res) => {

    const { username, password } = req.body;

    if (
        username === ADMIN.username &&
        password === ADMIN.password
    ) {
        return res.json({
            ok: true
        });
    }

    res.json({
        ok: false,
        message: "Invalid admin credentials ❌"
    });

});

// ================= ADMIN USERS =================
app.get("/admin-users", async (req, res) => {

    try {

        const users = await User.find({}, "-password")
            .sort({ createdAt: -1 });

        res.json(users);

    } catch (err) {

        res.json({
            message: "Error loading users ❌"
        });

    }

});

// ================= ADMIN DELETE USER =================
app.post("/admin-delete-user", async (req, res) => {

    try {

        await User.deleteOne({
            username: req.body.username
        });

        res.json({
            ok: true,
            message: "User deleted ❌"
        });

    } catch (err) {

        res.json({
            ok: false,
            message: "Delete failed ❌"
        });

    }

});

// ================= ADMIN BAN USER =================
app.post("/admin-ban-user", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.body.username
        });

        if (!user) {
            return res.json({
                ok: false,
                message: "User not found ❌"
            });
        }

        // Toggle ban
        user.banned = !user.banned;

        await user.save();

        res.json({
            ok: true,
            banned: user.banned,
            message: user.banned
                ? "User banned 🚫"
                : "User unbanned ✅"
        });

    } catch (err) {

        res.json({
            ok: false,
            message: "Ban error ❌"
        });

    }

});
// ================= ADMIN EDIT BALANCE =================
app.post("/admin-edit-balance", async (req, res) => {

    try {

        const { username, amount } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            return res.json({
                ok: false,
                message: "User not found ❌"
            });
        }

        user.coins += Number(amount);

        // prevent negative balance
        if (user.coins < 0) {
            user.coins = 0;
        }

        await user.save();

        res.json({
            ok: true,
            message: `Balance updated for ${username} ✅`
        });

    } catch (err) {

        res.json({
            ok: false,
            message: "Balance update error ❌"
        });

    }

});
// ================= SEND ANNOUNCEMENT =================
app.post("/send-announcement", (req, res) => {

    const { message } = req.body;

    if (!message) {
        return res.json({
            ok: false,
            message: "Message required ❌"
        });
    }

    globalAnnouncement = message;

    res.json({
        ok: true,
        message: "Announcement sent ✅"
    });

});

// ================= GET ANNOUNCEMENT =================
app.get("/get-announcement", (req, res) => {

    res.json({
        announcement: globalAnnouncement
    });

});

// ================= LEADERBOARD =================
app.get("/leaderboard", async (req, res) => {

    try {

        const users = await User.find({})
            .sort({ coins: -1 })
            .limit(10);

        res.json(users);

    } catch (err) {

        res.json({
            message: "Leaderboard error ❌"
        });

    }

});

// ================= ACTIVE USERS =================
app.get("/active-users", async (req, res) => {

    try {

        const now = Date.now();

        const activeLimit = 5 * 60 * 1000;

        const users = await User.find({
            lastActive: {
                $gte: now - activeLimit
            }
        });

        res.json(users);

    } catch (err) {

        res.json({
            message: "Active users error ❌"
        });

    }

});

// ================= USER INFO =================
app.post("/user-info", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.body.username
        });

        if (!user) {
            return res.json({
                message: "User not found ❌"
            });
        }

        res.json({
            referralCode: user.referralCode,
            referrals: user.referrals.length,
            referralEarnings: user.referrals.length * 5
        });

    } catch (err) {

        res.json({
            message: "Error ❌"
        });

    }

});

// ================= MINE =================
app.post("/mine", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.body.username
        });

        if (!user) {
            return res.json({
                message: "User not found ❌"
            });
        }

        // Block banned users
        if (user.banned) {
            return res.json({
                message: "Account banned 🚫"
            });
        }

        const now = Date.now();

        // 24 HOURS
        const cooldown = 24 * 60 * 60 * 1000;

        // Cooldown check
        if (
            user.lastMine &&
            now - user.lastMine < cooldown
        ) {

            const remaining = Math.ceil(
                (cooldown - (now - user.lastMine)) / 1000
            );

            return res.json({
                message: "Wait cooldown ❌",
                coins: user.coins,
                level: user.level,
                remaining
            });
        }

        // Mining reward
        const reward = user.level * 2;

        user.coins += reward;
        user.totalMined += reward;

        user.lastMine = now;
        user.lastActive = now;

        await user.save();

        res.json({
            message: `Mined +${reward} LCM ✅`,
            coins: user.coins,
            level: user.level
        });

    } catch (err) {

        console.log(err);

        res.json({
            message: "Mine error ❌"
        });

    }

});

// ================= UPGRADE =================
app.post("/upgrade", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.body.username
        });

        if (!user) {
            return res.json({
                message: "User not found ❌"
            });
        }

        if (user.banned) {
            return res.json({
                message: "Account banned 🚫"
            });
        }

        const cost = user.level * 10;

        if (user.coins < cost) {
            return res.json({
                message: "Not enough coins ❌"
            });
        }

        user.coins -= cost;

        user.level += 1;

        user.lastActive = Date.now();

        await user.save();

        res.json({
            message: "Upgraded successfully ⬆️",
            coins: user.coins,
            level: user.level
        });

    } catch (err) {

        res.json({
            message: "Upgrade error ❌"
        });

    }

});

// ================= TIME LEFT =================
app.post("/mine-time-left", async (req, res) => {

    try {

        const user = await User.findOne({
            username: req.body.username
        });

        if (!user) {
            return res.json({
                remaining: 0
            });
        }

        const cooldown = 24 * 60 * 60 * 1000;

        const now = Date.now();

        if (
            !user.lastMine ||
            now - user.lastMine >= cooldown
        ) {
            return res.json({
                remaining: 0
            });
        }

        const remaining = Math.ceil(
            (cooldown - (now - user.lastMine)) / 1000
        );

        res.json({
            remaining
        });

    } catch (err) {

        res.json({
            remaining: 0
        });

    }

});
// ================= SERVER START =================
app.listen(PORT, () => {
    console.log(`LCM running on port ${PORT} 🚀`);
});