"use client";

import { FormEvent, useState } from "react";

/** Private, deliberately unlinked operator gate for the controlled demo send. */
export default function DemoAccessPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function authorize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const key = new FormData(form).get("key");
    try {
      const response = await fetch("/api/demo-access", {
        body: JSON.stringify({ key }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setMessage(response.ok ? "Demo access enabled for this browser session." : "Demo access was not enabled.");
      if (response.ok) form.reset();
    } catch {
      setMessage("Demo access was not enabled.");
    }
  }

  return (
    <main>
      <h1>Controlled demo access</h1>
      <p>Enter the private demo key to enable the test alert in this browser session.</p>
      <form onSubmit={authorize}>
        <label htmlFor="demo-key">Demo key</label>
        <input autoComplete="off" id="demo-key" name="key" required type="password" />
        <button type="submit">Enable demo access</button>
      </form>
      {message === null ? null : <p role="status">{message}</p>}
    </main>
  );
}
