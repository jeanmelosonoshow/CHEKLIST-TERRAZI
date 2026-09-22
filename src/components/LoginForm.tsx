"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: form.get("login"), password: form.get("password") }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Não foi possível entrar.");
      setLoading(false);
      return;
    }
    router.replace(data.redirectTo);
    router.refresh();
  }

  return (
    <form className="loginForm" onSubmit={submit}>
      <label>Login<input name="login" autoComplete="username" required autoFocus /></label>
      <label>Senha<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p className="formError" role="alert">{error}</p>}
      <button className="primaryButton" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
