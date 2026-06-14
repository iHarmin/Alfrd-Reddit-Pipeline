"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Signup failed");
      return;
    }

    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-[#08080c] text-white flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-gray-950 border border-gray-800 rounded-3xl p-8 shadow-xl">
        <h1 className="text-3xl font-semibold mb-6">Create an account</h1>
        <form onSubmit={submit} className="space-y-5">
          <label className="block text-sm text-gray-300">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </label>
          <label className="block text-sm text-gray-300">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </label>
          <label className="block text-sm text-gray-300">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
              required
            />
          </label>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-700"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-blue-400 hover:text-blue-300">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
