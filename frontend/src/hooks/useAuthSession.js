import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  cleanAuthUrl,
  passwordResetRedirectUrl,
  urlHasPasswordRecoveryToken,
} from "../utils/auth";

export function useAuthSession() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("signIn");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!mounted) return;
      setSession(sessionData.session);
      if (urlHasPasswordRecoveryToken()) {
        setAuthMode("updatePassword");
        setAuthMessage("Enter a new password for your account.");
        setAuthError("");
      }
      setAuthLoading(false);
    });

    const { data: listenerData } = supabase.auth.onAuthStateChange(
      (authEvent, currentSession) => {
        setSession(currentSession);
        if (authEvent === "PASSWORD_RECOVERY") {
          setAuthMode("updatePassword");
          setAuthPassword("");
          setAuthMessage("Enter a new password for your account.");
          setAuthError("");
        }
      },
    );

    return () => {
      mounted = false;
      listenerData.subscription.unsubscribe();
    };
  }, []);

  async function handleAuth(event) {
    event.preventDefault();
    if (!supabase) return;

    setAuthLoading(true);
    setAuthMessage("");
    setAuthError("");

    try {
      const email = authEmail.trim();
      const password = authPassword;

      if (authMode === "forgotPassword") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo: passwordResetRedirectUrl() },
        );
        if (resetError) throw resetError;
        setAuthMessage("Check your email for a password reset link.");
        return;
      }

      if (authMode === "updatePassword") {
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });
        if (updateError) throw updateError;
        setAuthMessage("Password updated.");
        setAuthPassword("");
        setAuthMode("signIn");
        cleanAuthUrl();
        return;
      }

      const authResponse =
        authMode === "signIn"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (authResponse.error) throw authResponse.error;

      if (authMode === "signUp" && !authResponse.data.session) {
        setAuthMessage("Check your email to confirm your account.");
      } else {
        setAuthMessage(authMode === "signIn" ? "Signed in." : "Signed up.");
      }
      setAuthPassword("");
    } catch (errorObject) {
      setAuthError(errorObject.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return {
    session,
    signOut,
    showingPasswordResetPanel: authMode === "updatePassword",
    authProps: {
      supabaseReady: Boolean(supabase),
      authMode,
      setAuthMode,
      authEmail,
      setAuthEmail,
      authPassword,
      setAuthPassword,
      authLoading,
      authMessage,
      authError,
      onSubmit: handleAuth,
    },
  };
}
