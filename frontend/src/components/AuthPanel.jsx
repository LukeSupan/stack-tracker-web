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
  const isForgotPassword = authMode === "forgotPassword";
  const isUpdatePassword = authMode === "updatePassword";
  const showEmail = !isUpdatePassword;
  const showPassword = !isForgotPassword;
  const showModeToggle = !isForgotPassword && !isUpdatePassword;

  const submitLabel =
    authLoading
      ? "Working..."
      : authMode === "signIn"
        ? "Sign In"
        : authMode === "signUp"
          ? "Sign Up"
          : isForgotPassword
            ? "Send Reset Link"
            : "Update Password";

  return (
    <div className="mt-6 border border-zinc-500 bg-zinc-700 p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-100 text-xs uppercase tracking-widest">
          {isForgotPassword
            ? "Reset Password"
            : isUpdatePassword
              ? "New Password"
              : "Account"}
        </span>
        {showModeToggle && (
          <button
            onClick={() =>
              setAuthMode(authMode === "signIn" ? "signUp" : "signIn")
            }
            className="text-zinc-400 hover:text-amber-400 text-xs underline"
          >
            {authMode === "signIn" ? "Create account" : "Sign in"}
          </button>
        )}
      </div>

      {!supabaseReady ? (
        <p className="text-red-400 text-xs">
          Supabase is not configured. Add your Vite env values first.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-2">
          {showEmail && (
            <input
              className="w-full bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 focus:outline-none focus:border-amber-400/40"
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              required
            />
          )}
          {showPassword && (
            <input
              className="w-full bg-zinc-600 border border-zinc-500 text-zinc-200 text-xs p-2 focus:outline-none focus:border-amber-400/40"
              type="password"
              placeholder={isUpdatePassword ? "New password" : "Password"}
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              required
            />
          )}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-600 text-white text-xs disabled:opacity-50"
          >
            {submitLabel}
          </button>
          {authMode === "signIn" && (
            <button
              type="button"
              onClick={() => setAuthMode("forgotPassword")}
              className="text-zinc-400 hover:text-amber-400 text-xs underline"
            >
              Forgot password?
            </button>
          )}
          {(isForgotPassword || isUpdatePassword) && (
            <button
              type="button"
              onClick={() => setAuthMode("signIn")}
              className="text-zinc-400 hover:text-amber-400 text-xs underline"
            >
              Back to sign in
            </button>
          )}
          {authMessage && (
            <p className="text-emerald-400 text-xs">{authMessage}</p>
          )}
          {authError && <p className="text-red-400 text-xs">{authError}</p>}
        </form>
      )}
    </div>
  );
}
