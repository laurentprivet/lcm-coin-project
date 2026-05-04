const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcryptjs");
const multer = require("multer");

const app = express();

// ================= GLOBAL VARIABLES =================
let latestVideo = null;
let videoTime = null;

// ================= ADMIN =================
const ADMIN = {
    username: "admin",
    password: "admin123"
};

// ================= PORT =================
const PORT = process.env.PORT || 3000;

// ================= MIDDLEWARE =================
app.use(express.static("public"));
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

// ================= UPLOAD CONFIG =================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// ================= SAFE HANDLERS =================
process.on("uncaughtException", err => {
    console.log("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", err => {
    console.log("❌ Unhandled Rejection:", err);
});

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
    lastMine: { type: Number, default: 0 },
    totalMined: { type: Number, default: 0 },
    lastActive: { type: Number, default: 0 },
    banned: { type: Boolean, default: false },
    transactions: { type: Array, default: [] },
    withdrawals: { type: Array, default: [] }
});

const User = mongoose.model("User", userSchema);

// ================= REF CODE =================
function generateReferralCode(username) {
    return username + Math.floor(1000 + Math.random() * 9000);
}

// ================= ROUTES =================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// ================= UPLOAD VIDEO (FIXED) =================
app.post("/upload-video", upload.single("video"), (req, res) => {
    try {
        if (!req.file) {
            return res.json({ message: "No file uploaded ❌" });
        }

        latestVideo = "/uploads/" + req.file.filename;
        videoTime = Date.now();

        res.json({
            message: "Video uploaded successfully ✅",
            file: latestVideo
        });

    } catch (err) {
        console.log(err);
        res.json({ message: "Upload error ❌" });
    }
});

// ================= GET VIDEO =================
app.get("/latest-video", (req, res) => {
    res.json({
        video: latestVideo,
        time: videoTime
    });
});

// ================= SERVER START =================
app.listen(PORT, () => {
    console.log(`LCM running on port ${PORT} 🚀`);
});