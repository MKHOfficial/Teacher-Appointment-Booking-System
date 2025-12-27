import React, { useState } from "react";

function TeacherLogin({ setToken, setRole, setTeacherName }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username.trim() || !password.trim()) {
      alert("Please enter username and password");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.user.role === "teacher") {
        setToken(data.token);
        setRole("teacher");
        setTeacherName(data.user.teacherName);
        alert(`👨‍🏫 Welcome ${data.user.teacherName}!`);
      } else if (data.user.role === "student") {
        alert("❌ This is a student account. Please use teacher credentials.");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Network error. Please check if server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-box">
      <h3>👨‍🏫 Teacher Login</h3>
      
      <input
        type="text"
        placeholder="Teacher username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        disabled={loading}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        disabled={loading}
      />

      <button onClick={login} disabled={loading}>
        {loading ? "Logging in..." : "Login as Teacher"}
      </button>
      
      <div className="teacher-credentials">
        <p><strong>Demo Teachers:</strong></p>
        <p>Username: sirali | Password: 1234</p>
        <p>Username: misssana | Password: 1234</p>
      </div>
    </div>
  );
}

export default TeacherLogin;