import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiClientError } from "../api/client";
import { useAuth } from "../api/useAuth";
import type { AuthUser } from "../types";

export default function LoginPage() {
  const [email, setEmail] = useState("cashier@coffeecorner.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      login(res.token, res.user as AuthUser);
      navigate(res.user.role === "admin" ? "/admin" : "/pos");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="centered">
      <form className="card" onSubmit={handleSubmit}>
        <h1>BITO POS</h1>
        <p className="muted">Sign in to continue</p>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="muted small">
          Seeded demo users (password: <code>password123</code>):
          <br />
          cashier@coffeecorner.test · admin@coffeecorner.test
          <br />
          cashier@booknook.test · admin@booknook.test
        </p>
      </form>
    </div>
  );
}
