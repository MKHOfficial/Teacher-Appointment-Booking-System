const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  studentName: String,
  teacherName: String,
  teacherUsername: String,  // store username of teacher for auth
  time: String
});

module.exports = mongoose.model("Appointment", appointmentSchema);
