import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // 🔑 Hardcoded demo credentials (replace with API later)
    if (username === "admin" && password === "1234") {
      localStorage.setItem("isLoggedIn", "true");
      navigate("/Master");
    } else {
      alert("Invalid credentials!");
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "10%" }}>
      <form onSubmit={handleLogin} style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "10px" }}>
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        /><br /><br />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br /><br />
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
