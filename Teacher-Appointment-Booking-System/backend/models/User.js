const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher"], required: true },
  teacherName: { type: String, default: "" } // only for teachers
});

module.exports = mongoose.model("User", userSchema);