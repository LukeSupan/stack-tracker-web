export function AuthPanel({
  supabaseReady,
  authMode,
  setAuthMode,
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authLoading,
  authMessage,
  authError,
  onSubmit,
}) {
  return (
    <div className="mt-6 border border-zinc-500 bg-zinc-700 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-100 text-xs uppercase tracking-widest">
          Account
        </span>
        <button
          onClick={() =>
            setAuthMode(authMode === "signIn" ? "signUp" : "signIn")
          }
          className="text-zinc-400 hover:text-amber-400 text-xs underline"
        >
          {authMode === "signIn" ? "Create account" : "Sign in"}
        </button>
      </div>

      {!supabaseReady ? (
        <p className="text-red-400 text-xs">
          Supabase is not configured. Add your Vite env values first.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-2">
          <input
            className="w-full bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 focus:outline-none focus:border-amber-400/40"
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            required
          />
          <input
            className="w-full bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 focus:outline-none focus:border-amber-400/40"
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={(event) => setAuthPassword(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={authLoading}
            className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-600 text-white text-xs disabled:opacity-50"
          >
            {authLoading
              ? "Working..."
              : authMode === "signIn"
                ? "Sign In"
                : "Sign Up"}
          </button>
          {authMessage && (
            <p className="text-emerald-400 text-xs">{authMessage}</p>
          )}
          {authError && <p className="text-red-400 text-xs">{authError}</p>}
        </form>
      )}
    </div>
  );
}
