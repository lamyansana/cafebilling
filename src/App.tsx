import React, { useState, useEffect } from "react";
import Master from "./Master";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

interface ProfileRow {
  cafe_id: number;
  role: "admin" | "staff" | "viewer";
}

const App: React.FC = () => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [cafeName, setCafeName] = useState("Cafe Dashboard"); // default/fallback
  const [user, setUser] = useState<any>(null);
  const [cafeId, setCafeId] = useState<number | null>(null);
  const [role, setRole] = useState<"admin" | "staff" | "viewer" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const navigate = useNavigate();

  const fetchCafeName = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from("cafes")
        .select("name")
        .eq("id", id)
        .single();

      if (data && !error) {
        setCafeName(data.name);
      } else {
        console.error("Error fetching cafe name:", error);
      }
    } catch (err) {
      console.error("Unexpected error fetching cafe name:", err);
    }
  };

  useEffect(() => {
    if (cafeId !== null) {
      fetchCafeName(cafeId);
    }
  }, [cafeId]);

  // Restore session on page load
  useEffect(() => {
    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user) {
        setUser(session.user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("cafe_id, role")
          .eq("id", session.user.id)
          .single<ProfileRow>();

        if (profileData) {
          setCafeId(profileData.cafe_id);
          setRole(profileData.role);
        }
      }
      setInitializing(false);
    };

    restoreSession();
  }, []);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (loginError || !loginData.user) {
        alert(loginError?.message || "Login failed");
        setLoading(false);
        return;
      }

      const loggedInUser = loginData.user;
      setUser(loggedInUser);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("cafe_id, role")
        .eq("id", loggedInUser.id)
        .single<ProfileRow>();

      if (profileError || !profileData) {
        alert("No cafe ID found for this user.");
        setCafeId(null);
      } else {
        setCafeId(profileData.cafe_id);
        setRole(profileData.role);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    }

    setUser(null);
    setCafeId(null);
    setRole(null);
    setEmail("");
    setPassword("");

    // Always redirect to root on logout
    navigate("/", { replace: true });
  };

  // Splash screen while restoring session
  if (initializing) return <p>Loading...</p>;

  // Login form if not logged in
  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: prefersDark ? "#1e1e1e" : "#f0f4f8",
          color: prefersDark ? "#f5f5f5" : "#000",
        }}
      >
        <div
          style={{
            padding: "2rem",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            width: "300px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginBottom: "1.5rem" }}>Login</h2>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                marginBottom: "1rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.5rem",
                marginBottom: "1.5rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Fetching cafeId if not loaded yet
  if (user && cafeId === null) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "1.2rem",
        }}
      >
        Fetching your cafe data...
      </div>
    );
  }

  // Render Master when logged in

  return (
    <div
      className={prefersDark ? "dark-mode" : ""}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
      }}
    >
      {/* Top text/header */}
      <div
        style={{
          backgroundColor: prefersDark ? "#1e1e1e" : "#f0f4f8",
          color: prefersDark ? "#f5f5f5" : "#000",
          padding: "0.5rem 1rem",
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "1rem",
        }}
      >
        {cafeName} Dashboard!
      </div>

      {/* Main content fills remaining space */}
      <div style={{ flexGrow: 1, display: "flex" }}>
        {/* LeftPane + Master layout */}
        <Master cafeId={cafeId!} role={role!} handleLogout={handleLogout} />
      </div>
    </div>
  );
};

export default App;
