import React, { useState, useEffect } from "react"
import Master from "./Master"
import { supabase } from "./supabaseClient"

interface ProfileRow {
  cafe_id: number
  role: "admin" | "staff"
}

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null)
  const [cafeId, setCafeId] = useState<number | null>(null)
  const [role, setRole] = useState<"admin" | "staff" | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true) // 👈 NEW

  // 👇 Restore session on page load
  useEffect(() => {
    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (session?.user) {
        setUser(session.user)

        // Fetch profile for cafeId + role
        const { data: profileData } = await supabase
          .from("profiles")
          .select("cafe_id, role")
          .eq("id", session.user.id)
          .single<ProfileRow>()

        if (profileData) {
          setCafeId(profileData.cafe_id)
          setRole(profileData.role)
        }
      }
      setInitializing(false)
    }

    restoreSession()
  }, [])

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })

      if (loginError || !loginData.user) {
        alert(loginError?.message || "Login failed")
        setLoading(false)
        return
      }

      const loggedInUser = loginData.user
      setUser(loggedInUser)

      // Fetch profile for cafeId + role
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("cafe_id, role")
        .eq("id", loggedInUser.id)
        .single<ProfileRow>()

      if (profileError || !profileData) {
        alert("No cafe ID found for this user.")
        setCafeId(null)
      } else {
        setCafeId(profileData.cafe_id)
        setRole(profileData.role)
      }
    } catch (err) {
      console.error("Login error:", err)
      alert("Login failed")
    } finally {
      setLoading(false)
    }
  }

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCafeId(null)
    setRole(null)
    setEmail("")
    setPassword("")
  }

  // ⏳ Show splash screen while restoring session
  if (initializing) {
    return <p>Loading...</p>
  }

  // If not logged in → show login form
  if (!user) {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f0f4f8",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "2rem",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            width: "300px",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginBottom: "1.5rem" }}>Login</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
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
                fontSize: "1rem",
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // If logged in but cafeId not yet loaded
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
    )
  }

  // ✅ Render Master only when user +
  // ✅ Render Master only when user + cafeId + role are available
  return (
    <div style={{ padding: "2rem" }}>
      <button
        onClick={handleLogout}
        style={{
          marginBottom: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#f44336",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>

      {/* Pass role + cafeId to Master */}
      <Master cafeId={cafeId!} role={role!} />
    </div>
  )
}

export default App
