// Landing state: nothing is embedded until a workbook is picked in the tree.
export default function FolderExplorerIndexPage() {
  return (
    <div className="rounded-xl border border-black/[0.06] shadow-card bg-white h-full min-h-[420px] flex items-center justify-center p-8 text-center">
      <div>
        <p className="font-medium text-ink-primary text-sm mb-1">Pick a workbook</p>
        <p className="text-xs text-ink-secondary max-w-xs leading-relaxed">
          Choose a workbook from the folder tree on the left to embed it here.
        </p>
      </div>
    </div>
  );
}
