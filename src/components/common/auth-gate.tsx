"use client";

import { type FormEvent, useEffect, useState } from "react";
import { AUTH_STORAGE_KEY } from "@/lib/auth";
import { orbitron } from "@/lib/fonts";

type AuthGateProps = {
  children: React.ReactNode;
  initialAuthenticated: boolean;
};

type VerificationState = "idle" | "loading" | "error";

export function AuthGate({ children, initialAuthenticated }: AuthGateProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<VerificationState>("idle");
  const [message, setMessage] = useState("Enter the access password to continue.");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (initialAuthenticated) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
      return;
    }

    if (window.localStorage.getItem(AUTH_STORAGE_KEY) === "true") {
      setAuthenticated(true);
    }
  }, [initialAuthenticated]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setState("error");
      setMessage("Password is required.");
      return;
    }

    setState("loading");
    setMessage("Checking access...");

    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      setState("error");
      setMessage(payload?.message ?? "Invalid password.");
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
    setAuthenticated(true);
    setState("idle");
    setMessage("Access granted.");
    setPassword("");
  }

  if (authenticated) {
    return children;
  }

  return (
    <>
      <div aria-hidden="true">{children}</div>
      <div className="auth-lock" role="presentation">
        <div className="auth-lock__panel" role="dialog" aria-modal="true" aria-labelledby="auth-lock-title">
          <p className="auth-lock__eyebrow">Personal use only</p>
          <h1 id="auth-lock-title" className={`auth-lock__title ${orbitron.className}`}>
            Enter password to open Tracker
          </h1>
          <p className="auth-lock__copy">
            This application is intended for personal use, so access is password
            protected. Only the authorized user can enter this instance for now.
            If you want to use Tracker yourself, please clone the GitHub
            repository, create your own version, and connect it to your own
            database and environment setup.
          </p>
          <form className="auth-lock__form" onSubmit={handleSubmit}>
            <label className="auth-lock__label" htmlFor="tracker-password">
              Password
            </label>
            <input
              id="tracker-password"
              className="auth-lock__input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              spellCheck={false}
              placeholder="Enter password"
              disabled={state === "loading"}
            />
            <button className="auth-lock__button" type="submit" disabled={state === "loading"}>
              {state === "loading" ? "Verifying..." : "Unlock Tracker"}
            </button>
          </form>
          <p className={`auth-lock__message auth-lock__message--${state}`} aria-live="polite">
            {message}
          </p>
          <p className="auth-lock__note">
            For your own deployment, set up a separate database and define your
            own <span>AUTH_PASSWORD</span> value in <span>.env</span>.
          </p>
        </div>
      </div>
    </>
  );
}
