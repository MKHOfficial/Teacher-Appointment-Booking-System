import React, { useEffect, useState } from "react";
import StudentAuth from "./components/StudentAuth";
import TeacherLogin from "./components/TeacherLogin";
import "./App.css";

function App() {
  const [role, setRole] = useState(null); // "student" or "teacher"
  const [student, setStudent] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [token, setToken] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [slot, setSlot] = useState("");
  const [freeSlots, setFreeSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchTeachers();
    fetchAppointments();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await fetch("http://localhost:5000/teachers");
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const response = await fetch("http://localhost:5000/appointments");
      const data = await response.json();
      setAppointments(data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const handleTeacherChange = async (e) => {
    const name = e.target.value;
    setSelectedTeacher(name);
    setSlot("");

    if (name) {
      try {
        const response = await fetch(`http://localhost:5000/teachers/${name}/free-slots`);
        const data = await response.json();
        setFreeSlots(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching free slots:", error);
        setFreeSlots([]);
      }
    }
  };

  const bookAppointment = async () => {
    if (!student || !selectedTeacher || !slot) {
      alert("Please select a teacher and time slot");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { "Authorization": `Bearer ${token}` })
        },
        body: JSON.stringify({
          studentName: student,
          teacherName: selectedTeacher,
          time: slot
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "✅ Appointment booked successfully!");
        fetchAppointments();
        setSelectedTeacher("");
        setSlot("");
        setFreeSlots([]);
      } else {
        alert(data.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    if (!token) {
      alert("Please login as teacher to cancel appointments");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/appointments/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Appointment cancelled");
        fetchAppointments();
      } else {
        alert(data.message || "Failed to cancel appointment");
      }
    } catch (error) {
      console.error("Cancel error:", error);
      alert("Network error");
    }
  };

  const logout = () => {
    setRole(null);
    setStudent("");
    setTeacherName("");
    setToken("");
    setSelectedTeacher("");
    setSlot("");
    setFreeSlots([]);
    alert("Logged out successfully!");
  };

  return (
    <div className="container">
      <header className="header">
        <h1>📚 Teacher Appointment Booking System</h1>
        <p>Schedule meetings with teachers easily</p>
        
        {(student || teacherName) && (
          <div className="user-info">
            <span>
              👤 {role === "student" ? `Student: ${student}` : `Teacher: ${teacherName}`}
            </span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        )}
      </header>

      <main className="main-content">
        {/* AUTHENTICATION SECTION */}
        {!student && !teacherName && (
          <div className="auth-section">
            <div className="auth-container">
              <StudentAuth 
                setStudent={setStudent}
                setToken={setToken}
                setRole={setRole}
              />
              <TeacherLogin 
                setToken={setToken}
                setRole={setRole}
                setTeacherName={setTeacherName}
              />
            </div>
          </div>
        )}

        {/* STUDENT DASHBOARD */}
        {role === "student" && student && (
          <div className="dashboard student-dashboard">
            <h2>🎓 Student Dashboard</h2>
            <div className="booking-form">
              <div className="form-group">
                <label>Your Name:</label>
                <input 
                  type="text" 
                  value={student} 
                  readOnly 
                  className="disabled-input"
                />
              </div>

              <div className="form-group">
                <label>Select Teacher:</label>
                <select 
                  value={selectedTeacher} 
                  onChange={handleTeacherChange}
                  disabled={loading}
                >
                  <option value="">-- Choose a teacher --</option>
                  {teachers.map(teacher => (
                    <option key={teacher._id} value={teacher.name}>
                      👨‍🏫 {teacher.name} - {teacher.subject}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTeacher && (
                <div className="form-group">
                  <label>Available Time Slots:</label>
                  <select 
                    value={slot} 
                    onChange={(e) => setSlot(e.target.value)}
                    disabled={loading || freeSlots.length === 0}
                  >
                    <option value="">-- Select time --</option>
                    {freeSlots.map((slotTime, index) => (
                      <option key={index} value={slotTime}>
                        ⏰ {slotTime}
                      </option>
                    ))}
                  </select>
                  {freeSlots.length === 0 && (
                    <p className="no-slots">No available slots for this teacher</p>
                  )}
                </div>
              )}

              <button 
                onClick={bookAppointment}
                disabled={!selectedTeacher || !slot || loading}
                className="book-btn"
              >
                {loading ? "Booking..." : "📅 Book Appointment"}
              </button>
            </div>
          </div>
        )}

        {/* TEACHER DASHBOARD */}
        {role === "teacher" && teacherName && (
          <div className="dashboard teacher-dashboard">
            <h2>👨‍🏫 Teacher Dashboard - {teacherName}</h2>
            <p className="welcome-message">Manage your appointments below</p>
          </div>
        )}

        {/* APPOINTMENTS SECTION */}
        <div className="appointments-section">
          <h2>📋 All Appointments</h2>
          
          {appointments.length === 0 ? (
            <p className="no-appointments">No appointments booked yet.</p>
          ) : (
            <div className="appointments-table-container">
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Teacher</th>
                    <th>Time</th>
                    {role === "teacher" && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment, index) => (
                    <tr key={appointment._id} className="appointment-row">
                      <td>{index + 1}</td>
                      <td>👨‍🎓 {appointment.studentName}</td>
                      <td>👨‍🏫 {appointment.teacherName}</td>
                      <td>⏰ {appointment.time}</td>
                      {role === "teacher" && (
                        <td>
                          {appointment.teacherName === teacherName && (
                            <button
                              onClick={() => cancelAppointment(appointment._id)}
                              className="cancel-btn"
                            >
                              ❌ Cancel
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SETUP INSTRUCTIONS */}
        {/* <div className="setup-section">
          <h3>⚙️ Setup Instructions</h3>
          <p>1. Start MongoDB: <code>mongod</code></p>
          <p>2. Start backend: <code>node server.js</code></p>
          <p>3. Setup database: <a href="http://localhost:5000/setup" target="_blank">Click here</a></p>
          <p><strong>Demo Credentials:</strong></p>
          <ul>
            <li>Teachers: sirali/1234, misssana/1234</li>
            <li>Student: student1/student123 (or create new)</li>
          </ul>
        </div> */}
      </main>

      {/* <footer className="footer">
        <p>Teacher Appointment System | MERN Stack Project | Uses React Hooks (useState, useEffect)</p>
      </footer> */}
    </div>
  );
}

export default App;