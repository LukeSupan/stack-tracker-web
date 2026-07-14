import { useEffect, useRef, useState } from "react";
import {
  readStoredNumber,
  usePersistedElementHeight,
} from "./usePersistedElementSize";

const PASTE_INPUT_HEIGHT_KEY = "pasteInputHeight";
const EASY_INPUT_HEIGHT_KEY = "easyInputHeight";
const INPUT_MODE_KEY = "inputMode";
const LEGACY_INPUT_STORAGE_KEYS = ["pasteInput", "gameTag", "games"];

function readInitialInputMode() {
  const savedMode = localStorage.getItem(INPUT_MODE_KEY);
  if (savedMode === "paste" || savedMode === "easy") return savedMode;
  return "easy";
}

function parseLines(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function useGameInput(isDesktop) {
  const [mode, setMode] = useState(readInitialInputMode);
  const [pasteInput, setPasteInput] = useState("");
  const [gameTag, setGameTag] = useState("");
  const [games, setGames] = useState([]);
  const [currentLine, setCurrentLine] = useState("");
  const pasteInputRef = useRef(null);
  const easyInputRef = useRef(null);
  const currentLineRef = useRef(null);
  const easyGamesEndRef = useRef(null);
  const [pasteInputHeight] = useState(() =>
    readStoredNumber(PASTE_INPUT_HEIGHT_KEY, 176, 176),
  );
  const [easyInputHeight] = useState(() =>
    readStoredNumber(EASY_INPUT_HEIGHT_KEY, 176, 176),
  );

  usePersistedElementHeight(pasteInputRef, PASTE_INPUT_HEIGHT_KEY, mode);
  usePersistedElementHeight(easyInputRef, EASY_INPUT_HEIGHT_KEY, mode);

  useEffect(() => {
    localStorage.setItem(INPUT_MODE_KEY, mode);
  }, [mode]);
  useEffect(() => {
    LEGACY_INPUT_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);
  useEffect(() => {
    if (mode === "easy") {
      easyGamesEndRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [games.length, mode]);

  function easyToLines() {
    return [gameTag.trim(), ...games];
  }

  function pasteToLines() {
    return parseLines(pasteInput);
  }

  function switchToPaste() {
    if (gameTag.trim() || games.length > 0) {
      setPasteInput([gameTag.trim(), ...games].join("\n"));
    }
    setMode("paste");
  }

  function switchToEasy() {
    const lines = parseLines(pasteInput);
    if (lines.length > 0) {
      setGameTag(lines[0]);
      setGames(lines.slice(1));
    }
    setMode("easy");
  }

  function toggleMode() {
    mode === "paste" ? switchToEasy() : switchToPaste();
  }

  function currentContent() {
    if (mode === "paste") return pasteInput.trim();
    return easyToLines()
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }

  function currentLines() {
    return mode === "paste" ? pasteToLines() : easyToLines();
  }

  function applySavedContent(content) {
    const lines = parseLines(content);
    setPasteInput(content);
    setGameTag(lines[0] || "");
    setGames(lines.slice(1));
    setCurrentLine("");
  }

  function addGame() {
    const trimmedLine = currentLine.trim();
    if (!trimmedLine) return;
    setGames((previousGames) => [...previousGames, trimmedLine]);
    setCurrentLine("");
    window.setTimeout(() => currentLineRef.current?.focus(), 0);
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addGame();
  }

  function clearInput() {
    setPasteInput("");
    setGameTag("");
    setGames([]);
    setCurrentLine("");
  }

  const gameCount =
    mode === "paste" ? Math.max(0, pasteToLines().length - 1) : games.length;
  const pasteInputStyle = {
    height: isDesktop ? pasteInputHeight : "min(42svh, 320px)",
  };
  const easyInputStyle = {
    height: isDesktop ? easyInputHeight : "min(58svh, 440px)",
  };

  return {
    mode,
    pasteInput,
    setPasteInput,
    gameTag,
    setGameTag,
    games,
    currentLine,
    setCurrentLine,
    pasteInputRef,
    easyInputRef,
    currentLineRef,
    easyGamesEndRef,
    pasteInputStyle,
    easyInputStyle,
    gameCount,
    toggleMode,
    currentContent,
    currentLines,
    applySavedContent,
    addGame,
    handleKeyDown,
    clearInput,
  };
}
