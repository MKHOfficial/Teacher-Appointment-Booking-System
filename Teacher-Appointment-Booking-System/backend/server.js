const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Teacher = require("./models/Teacher");
const User = require("./models/User");
const Appointment = require("./models/Appointment");

const app = express();
const JWT_SECRET = "secretkey123";

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/teacherAppointment")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// ==================== AUTH MIDDLEWARE ====================
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ==================== ROUTES ====================

// Home route
app.get("/", (req, res) => res.json({ 
  message: "Teacher Appointment API",
  status: "Running"
}));

// Get all teachers
app.get("/teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get free slots for a teacher
app.get("/teachers/:teacherName/free-slots", async (req, res) => {
  try {
    const teacherName = req.params.teacherName;
    const teacher = await Teacher.findOne({ name: teacherName });
    
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Parse available times (comma-separated)
    const allSlots = teacher.availableTime.split(",").map(s => s.trim());
    
    // Get booked appointments for this teacher
    const bookedAppointments = await Appointment.find({ teacherName });
    const bookedSlots = bookedAppointments.map(a => a.time);
    
    // Find free slots
    const freeSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
    
    res.json(freeSlots);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all appointments
app.get("/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ time: 1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Book appointment
app.post("/appointments", async (req, res) => {
  try {
    const { studentName, teacherName, time } = req.body;

    // Validation
    if (!studentName || !teacherName || !time) {
      return res.status(400).json({ 
        message: "Please provide student name, teacher name, and time" 
      });
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({ 
      teacherName, 
      time 
    });

    if (existingAppointment) {
      return res.status(400).json({ 
        message: "This time slot is already booked. Please choose another time." 
      });
    }

    // Check if teacher exists
    const teacher = await Teacher.findOne({ name: teacherName });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Check if time slot is valid (in teacher's available times)
    const availableSlots = teacher.availableTime.split(",").map(s => s.trim());
    if (!availableSlots.includes(time)) {
      return res.status(400).json({ 
        message: "Invalid time slot. Teacher is not available at this time." 
      });
    }

    // Create new appointment
    const newAppointment = new Appointment({
      studentName,
      teacherName,
      time
    });

    await newAppointment.save();

    res.status(201).json({ 
      message: "Appointment booked successfully!",
      appointment: newAppointment
    });

  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ message: "Failed to book appointment" });
  }
});

// Cancel appointment (Teacher only)
app.delete("/appointments/:id", auth, async (req, res) => {
  try {
    // Check if user is a teacher
    if (req.user.role !== "teacher") {
      return res.status(403).json({ 
        message: "Only teachers can cancel appointments" 
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Teacher can only cancel their own appointments
    const teacher = await User.findOne({ username: req.user.username });
    if (appointment.teacherName !== teacher.teacherName) {
      return res.status(403).json({ 
        message: "You can only cancel your own appointments" 
      });
    }

    await Appointment.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Appointment cancelled successfully" });

  } catch (err) {
    console.error("Cancel error:", err);
    res.status(500).json({ message: "Failed to cancel appointment" });
  }
});

// ==================== AUTH ROUTES ====================

// Student Signup
app.post("/student/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      password: hashedPassword,
      role: "student"
    });

    await newUser.save();

    // Generate token
    const token = jwt.sign(
      { 
        id: newUser._id, 
        username: newUser.username, 
        role: newUser.role 
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "Student registered successfully!",
      token,
      user: { username: newUser.username, role: newUser.role }
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login (Both Student and Teacher)
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        role: user.role,
        teacherName: user.teacherName 
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful!",
      token,
      user: { 
        username: user.username, 
        role: user.role,
        teacherName: user.teacherName 
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

// ==================== SETUP ROUTES ====================

// Add sample data (Run once)
app.get("/setup", async (req, res) => {
  try {
    // Clear existing data
    await Teacher.deleteMany({});
    await User.deleteMany({});
    await Appointment.deleteMany({});

    // Add sample teachers
    const sampleTeachers = [
      { name: "Sir Ali", subject: "Web Development", availableTime: "10:00,11:00,12:00" },
      { name: "Miss Sana", subject: "Database", availableTime: "13:00,14:00,15:00" },
      { name: "Mr. Ahmed", subject: "Data Structures", availableTime: "9:00,10:00,11:00" },
      { name: "Miss Fatima", subject: "Operating Systems", availableTime: "14:00,15:00,16:00" },
      { name: "Mr. Bilal", subject: "Computer Networks", availableTime: "11:00,12:00,13:00" }
    ];
    await Teacher.insertMany(sampleTeachers);

    // Add teacher users
    const teachers = [
      { username: "sirali", teacherName: "Sir Ali" },
      { username: "misssana", teacherName: "Miss Sana" },
      { username: "mrahmed", teacherName: "Mr. Ahmed" },
      { username: "missfatima", teacherName: "Miss Fatima" },
      { username: "mrbilal", teacherName: "Mr. Bilal" }
    ];

    for (let teacher of teachers) {
      const hashedPassword = await bcrypt.hash("1234", 10);
      await User.create({
        username: teacher.username,
        password: hashedPassword,
        role: "teacher",
        teacherName: teacher.teacherName
      });
    }

    // Add a sample student
    const studentPassword = await bcrypt.hash("student123", 10);
    await User.create({
      username: "student1",
      password: studentPassword,
      role: "student"
    });

    res.json({ 
      message: "Setup completed successfully!",
      teachers: sampleTeachers.length,
      users: teachers.length + 1
    });

  } catch (err) {
    console.error("Setup error:", err);
    res.status(500).json({ message: "Setup failed" });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Endpoints:`);
  console.log(`   GET  /                 - Home`);
  console.log(`   GET  /teachers         - List teachers`);
  console.log(`   GET  /appointments     - List appointments`);
  console.log(`   POST /student/signup   - Student signup`);
  console.log(`   POST /login            - Login`);
  console.log(`   POST /appointments     - Book appointment`);
  console.log(`   DELETE /appointments/:id - Cancel appointment (Teacher only)`);
  console.log(`   GET  /setup            - Setup database (run once)`);
});