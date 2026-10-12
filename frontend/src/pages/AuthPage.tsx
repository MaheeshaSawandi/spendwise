import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const { login, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand brand-lg">
          <span className="brand-mark">₨</span> SpendWise
        </div>
        <p className="muted">
          {isRegister ? "Create an account to start tracking your money." : "Welcome back. Log in to continue."}
        </p>
        <form className="form" onSubmit={submit}>
          {isRegister && (
            <label>
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!isRegister} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={isRegister ? 8 : undefined}
              required
            />
            {isRegister && <small className="muted">At least 8 characters</small>}
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}
          </button>
        </form>
        <p className="muted switch">
          {isRegister ? (
            <>Already have an account? <Link to="/login">Log in</Link></>
          ) : (
            <>New here? <Link to="/register">Create an account</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
