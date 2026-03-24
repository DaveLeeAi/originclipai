// src/app/(dashboard)/settings/page.tsx

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold tracking-tight">Settings</h1>
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-[#e4e2dd] bg-white p-5">
          <h2 className="mb-3 text-sm font-bold">Default caption style</h2>
          <select className="w-full max-w-xs rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none">
            <option value="karaoke">Karaoke (word-level highlight)</option>
            <option value="boxed">Boxed (background box)</option>
            <option value="minimal">Minimal (top-aligned)</option>
            <option value="impact">Impact (bold, large)</option>
            <option value="subtitle">Subtitle (classic)</option>
          </select>
        </div>
        <div className="rounded-2xl border border-[#e4e2dd] bg-white p-5">
          <h2 className="mb-3 text-sm font-bold">Default clip settings</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-[#6b6960]">Min duration (sec)</label>
              <input type="number" defaultValue={30} min={15} max={120} className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6b6960]">Max duration (sec)</label>
              <input type="number" defaultValue={90} min={30} max={180} className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6b6960]">Target clips</label>
              <input type="number" defaultValue={15} min={5} max={30} className="w-full rounded-lg border border-[#e4e2dd] px-3 py-2 text-sm outline-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
