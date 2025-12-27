import React, { useState } from "react";

function StudentAuth({ setStudent, setToken, setRole }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(true);
  const [loading, setLoading] = useState(false);

  const submitHandler = async () => {
    if (!username.trim() || !password.trim()) {
      alert("Please enter username and password");
      return;
    }

    setLoading(true);
    const url = isSignup
      ? "http://localhost:5000/student/signup"
      : "http://localhost:5000/login";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setStudent(username);
        setToken(data.token);
        setRole(data.user.role);
        alert(isSignup ? "🎉 Signup successful!" : "✅ Login successful!");
      } else {
        alert(data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("Network error. Please check if server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-box">
      <h3>{isSignup ? "🎓 Student Signup" : "🎓 Student Login"}</h3>

      <input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        disabled={loading}
      />

      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        disabled={loading}
      />

      <button onClick={submitHandler} disabled={loading}>
        {loading ? "Processing..." : (isSignup ? "Signup" : "Login")}
      </button>

      <p className="switch" onClick={() => setIsSignup(!isSignup)}>
        {isSignup 
          ? "Already have an account? Login here" 
          : "New student? Signup here"}
      </p>
    </div>
  );
}

export default StudentAuth;