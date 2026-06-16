export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-4 text-center bg-[#0f172a] text-[#f1f5f9]">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-xl font-bold mb-2">404 — 搵唔到</h1>
      <p className="text-sm text-[#94a3b8] mb-4">呢頁唔存在，返去主頁啦</p>
      <a href="/pipz" className="px-5 py-2 bg-[#a855f7] text-white rounded-xl font-bold text-sm">
        返去主頁
      </a>
    </div>
  )
}
