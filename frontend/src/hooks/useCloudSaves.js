import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

const ACTIVE_SAVE_ID_KEY_PREFIX = "activeSaveId";

function activeSaveStorageKey(userId) {
  return `${ACTIVE_SAVE_ID_KEY_PREFIX}:${userId}`;
}

function readStoredActiveSaveId(userId) {
  if (!userId) return null;
  return localStorage.getItem(activeSaveStorageKey(userId));
}

function rememberActiveSaveId(userId, saveId) {
  if (!userId) return;

  if (saveId) {
    localStorage.setItem(activeSaveStorageKey(userId), saveId);
    return;
  }

  localStorage.removeItem(activeSaveStorageKey(userId));
}

export function useCloudSaves({
  session,
  authLoading,
  currentContent,
  onLoadContent,
  onNewBlank,
}) {
  const [saves, setSaves] = useState([]);
  const [savesLoading, setSavesLoading] = useState(false);
  const [savesError, setSavesError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveName, setSaveName] = useState("");
  const [activeSaveId, setActiveSaveId] = useState(null);
  const activeSaveIdRef = useRef(activeSaveId);
  const onLoadContentRef = useRef(onLoadContent);
  const userId = session?.user?.id || null;

  useEffect(() => {
    activeSaveIdRef.current = activeSaveId;
  }, [activeSaveId]);

  useEffect(() => {
    onLoadContentRef.current = onLoadContent;
  }, [onLoadContent]);

  function commitActiveSaveId(saveId, { persist = true } = {}) {
    activeSaveIdRef.current = saveId;
    setActiveSaveId(saveId);
    if (persist) {
      rememberActiveSaveId(userId, saveId);
    }
  }

  const fetchSaves = useCallback(async () => {
    if (!supabase || !userId) return;
    setSavesLoading(true);
    setSavesError("");
    try {
      const { data: loadedSaves, error: loadError } = await supabase
        .from("saves")
        .select("id,name,content,created_at,updated_at")
        .order("updated_at", { ascending: false });

      if (loadError) throw loadError;
      const nextSaves = loadedSaves || [];
      const storedActiveSaveId = readStoredActiveSaveId(userId);
      const selectedSave =
        nextSaves.find((save) => save.id === activeSaveIdRef.current) ||
        nextSaves.find((save) => save.id === storedActiveSaveId);
      const shouldLoadStoredSaveContent =
        selectedSave &&
        !activeSaveIdRef.current &&
        selectedSave.id === storedActiveSaveId;

      setSaves(nextSaves);
      if (selectedSave) {
        activeSaveIdRef.current = selectedSave.id;
        setActiveSaveId(selectedSave.id);
        setSaveName(selectedSave.name);
        rememberActiveSaveId(userId, selectedSave.id);
        if (shouldLoadStoredSaveContent) {
          onLoadContentRef.current(selectedSave.content);
        }
      } else if (activeSaveIdRef.current || storedActiveSaveId) {
        activeSaveIdRef.current = null;
        setActiveSaveId(null);
        setSaveName("");
        rememberActiveSaveId(userId, null);
      }
    } catch (errorObject) {
      setSavesError(errorObject.message);
    } finally {
      setSavesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchSaves();
      return;
    }

    if (authLoading) return;

    setSaves([]);
    activeSaveIdRef.current = null;
    setActiveSaveId(null);
    setSaveName("");
  }, [authLoading, fetchSaves, userId]);

  async function autoUpdateActiveSaveContent(content) {
    if (!supabase) {
      return {
        saved: false,
        alert: true,
        message: "Stats submitted, but cloud saves are not configured.",
      };
    }

    let currentSession = session;
    if (!currentSession) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) {
        const message = `Stats submitted, but autosave could not verify your login: ${sessionError.message}`;
        setSavesError(message);
        return { saved: false, alert: true, message };
      }
      currentSession = sessionData.session;
    }

    if (!currentSession) {
      const message =
        "Stats submitted, but autosave did not run because you are signed out. Sign in again, then click Update Save.";
      setSavesError(message);
      return { saved: false, alert: true, message };
    }

    if (!activeSaveIdRef.current) {
      const message =
        "Stats submitted, but autosave did not run because no cloud save is selected. Load a save or click Save New before submitting.";
      setSavesError(message);
      return { saved: false, alert: true, message };
    }

    if (!content) {
      const message =
        "Stats submitted, but autosave did not run because there is no game data to save.";
      setSavesError(message);
      return { saved: false, alert: false, message };
    }

    setSavesError("");
    setSaveMessage("");

    try {
      const { data: updatedSave, error: updateError } = await supabase
        .from("saves")
        .update({ content })
        .eq("id", activeSaveIdRef.current)
        .select("id,name,content,created_at,updated_at")
        .single();

      if (updateError) throw updateError;
      setSaves((previousSaves) => [
        updatedSave,
        ...previousSaves.filter((save) => save.id !== updatedSave.id),
      ]);
      setSaveMessage("Save auto-updated.");
      return { saved: true, message: "Save auto-updated." };
    } catch (errorObject) {
      const message = `Stats submitted, but autosave failed: ${errorObject.message}`;
      setSavesError(message);
      return { saved: false, alert: true, message };
    }
  }

  async function writeSave({ forceNew = false } = {}) {
    if (!supabase) {
      setSavesError("Cloud saves are not configured.");
      return;
    }

    let currentSession = session;
    if (!currentSession) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) {
        setSavesError(`Could not verify your login: ${sessionError.message}`);
        return;
      }
      currentSession = sessionData.session;
    }

    if (!currentSession) {
      setSavesError("Sign in again before saving.");
      return;
    }

    const name = saveName.trim();
    const content = currentContent();

    if (!name) {
      setSavesError("Give this save a name first.");
      return;
    }

    if (!content) {
      setSavesError("There is no game data to save yet.");
      return;
    }

    setSavesError("");
    setSaveMessage("");

    try {
      if (activeSaveId && !forceNew) {
        const { data: updatedSave, error: updateError } = await supabase
          .from("saves")
          .update({ name, content })
          .eq("id", activeSaveId)
          .select("id,name,content,created_at,updated_at")
          .single();

        if (updateError) throw updateError;
        setSaves((previousSaves) => [
          updatedSave,
          ...previousSaves.filter((save) => save.id !== updatedSave.id),
        ]);
        setSaveMessage("Save updated.");
        return;
      }

      const { data: createdSave, error: createError } = await supabase
        .from("saves")
        .insert({ user_id: currentSession.user.id, name, content })
        .select("id,name,content,created_at,updated_at")
        .single();

      if (createError) throw createError;
      activeSaveIdRef.current = createdSave.id;
      setActiveSaveId(createdSave.id);
      rememberActiveSaveId(currentSession.user.id, createdSave.id);
      setSaves((previousSaves) => [
        createdSave,
        ...previousSaves.filter((save) => save.id !== createdSave.id),
      ]);
      setSaveMessage("Save created.");
    } catch (errorObject) {
      setSavesError(errorObject.message);
    }
  }

  function loadSave(save) {
    commitActiveSaveId(save.id);
    setSaveName(save.name);
    setSaveMessage("");
    setSavesError("");
    onLoadContent(save.content);
  }

  function newBlankSave() {
    commitActiveSaveId(null);
    setSaveName("");
    setSaveMessage("");
    setSavesError("");
    onNewBlank();
  }

  async function deleteSave(saveId) {
    if (!supabase) return;
    const confirmed = window.confirm("Delete this save permanently?");
    if (!confirmed) return;

    setSavesError("");
    setSaveMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("saves")
        .delete()
        .eq("id", saveId);

      if (deleteError) throw deleteError;
      setSaves((previousSaves) =>
        previousSaves.filter((save) => save.id !== saveId),
      );
      if (saveId === activeSaveId) {
        commitActiveSaveId(null);
      }
      setSaveMessage("Save deleted.");
    } catch (errorObject) {
      setSavesError(errorObject.message);
    }
  }

  return {
    autoUpdateActiveSaveContent,
    savesProps: {
      saves,
      savesLoading,
      savesError,
      saveMessage,
      saveName,
      setSaveName,
      activeSaveId,
      onSave: () => writeSave(),
      onSaveAsNew: () => writeSave({ forceNew: true }),
      onLoad: loadSave,
      onDelete: deleteSave,
      onNew: newBlankSave,
    },
  };
}
