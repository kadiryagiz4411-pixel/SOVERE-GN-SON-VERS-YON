type WorkspaceMode = 'b2c' | 'b2b';

export function WorkspaceModeSwitcher({
  value,
  onChange,
}: {
  value: WorkspaceMode;
  onChange: (next: WorkspaceMode) => void;
}) {
  return (
    <div
      className="workspace-switcher w-full bg-zinc-950 border border-amber-500/40 rounded-lg p-2"
      role="tablist"
      aria-label="Workspace mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'b2c'}
        className={value === 'b2c' ? 'on' : undefined}
        onClick={() => onChange('b2c')}
      >
        B2C Personal
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'b2b'}
        className={value === 'b2b' ? 'on' : undefined}
        onClick={() => onChange('b2b')}
      >
        B2B Agency
      </button>
    </div>
  );
}
