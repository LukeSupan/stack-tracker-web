import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function useCloudSaves({
  session,
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

  const fetchSaves = useCallback(async () => {
    if (!supabase || !session) return;
    setSavesLoading(true);
    setSavesError("");
    try {
      const { data: loadedSaves, error: loadError } = await supabase
        .from("saves")
        .select("id,name,content,created_at,updated_at")
        .order("updated_at", { ascending: false });

      if (loadError) throw loadError;
      setSaves(loadedSaves || []);
    } catch (errorObject) {
      setSavesError(errorObject.message);
    } finally {
      setSavesLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchSaves();
      return;
    }

    setSaves([]);
    setActiveSaveId(null);
    setSaveName("");
  }, [session, fetchSaves]);

  async function autoUpdateActiveSaveContent(content) {
    if (!supabase || !session || !activeSaveId || !content) return;

    setSavesError("");
    setSaveMessage("");

    try {
      const { data: updatedSave, error: updateError } = await supabase
        .from("saves")
        .update({ content })
        .eq("id", activeSaveId)
        .select("id,name,content,created_at,updated_at")
        .single();

      if (updateError) throw updateError;
      setSaves((previousSaves) => [
        updatedSave,
        ...previousSaves.filter((save) => save.id !== updatedSave.id),
      ]);
      setSaveMessage("Save auto-updated.");
    } catch (errorObject) {
      setSavesError(`Stats submitted, but autosave failed: ${errorObject.message}`);
    }
  }

  async function writeSave({ forceNew = false } = {}) {
    if (!supabase || !session) return;

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
        .insert({ user_id: session.user.id, name, content })
        .select("id,name,content,created_at,updated_at")
        .single();

      if (createError) throw createError;
      setActiveSaveId(createdSave.id);
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
    setActiveSaveId(save.id);
    setSaveName(save.name);
    setSaveMessage("");
    setSavesError("");
    onLoadContent(save.content);
  }

  function newBlankSave() {
    setActiveSaveId(null);
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
        setActiveSaveId(null);
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
