export function Section({ title, children }) {
  return (
    <div className="mb-12">
      <h2 className="text-amber-400 text-base font-black uppercase mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function MinGamesInput({ label, value, onChange }) {
  return (
    <label className="text-zinc-400 text-xs">
      <span className="block mb-1">{label}</span>
      <input
        className="w-full bg-zinc-600 border border-zinc-500 text-zinc-100 text-xs p-2 focus:outline-none focus:border-amber-400/40"
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
