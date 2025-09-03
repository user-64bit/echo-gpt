export const Popup = () => {
  const handleHardReload = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs?.[0]
      if (activeTab?.id !== undefined) {
        await chrome.tabs.reload(activeTab.id, { bypassCache: true })
      }
      window.close()
    } catch (error) {
      console.error('Failed to hard reload tab', error)
    }
  }

  const handleOpenOptions = async () => {
    try {
      if (chrome.runtime.openOptionsPage) {
        await chrome.runtime.openOptionsPage()
      }
      window.close()
    } catch (error) {
      console.error('Failed to open options page', error)
    }
  }

  const openInNewTab = (url: string) => {
    try {
      chrome.tabs.create({ url })
      window.close()
    } catch (error) {
      console.error('Failed to open link', url, error)
    }
  }

  const REPO_URL = 'https://github.com/user-64bit/echo-gpt'
  const DEV_GITHUB_URL = 'https://github.com/user-64bit'
  const REPORT_ISSUE_URL = `${REPO_URL}/issues/new/choose`
  const WEBSITE_URL = 'https://user64bit.wtf'

  return (
    <main className="w-[280px] bg-gradient-to-b from-indigo-50 to-white p-0">
      <header className="px-4 pt-4 pb-3 bg-white/70 backdrop-blur sticky top-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl">
            <img src="/img/logo-48.png" alt="Echo GPT" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">Echo GPT</h1>
            <p className="text-xs text-gray-500">A Chrome extension that enhances your ChatGPT experience by adding bookmark and pinned conversations feature.</p>
          </div>
        </div>
      </header>

      <section className="p-4 pt-3">
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={handleHardReload}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-2.5 text-sm font-medium shadow hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
          >
            <span>Hard Reload (Bypass Cache)</span>
          </button>

          <button
            onClick={() => openInNewTab(REPO_URL)}
            className="w-full inline-flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-base">💻</span>
              <span>Open-source Repository</span>
            </span>
            <span className="text-gray-400">↗</span>
          </button>

          <button
            onClick={() => openInNewTab(DEV_GITHUB_URL)}
            className="w-full inline-flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-base">👨‍💻</span>
              <span>Developer on GitHub</span>
            </span>
            <span className="text-gray-400">↗</span>
          </button>

          <button
            onClick={() => openInNewTab(REPORT_ISSUE_URL)}
            className="w-full inline-flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-base">🐞</span>
              <span>Report an Issue</span>
            </span>
            <span className="text-gray-400">↗</span>
          </button>

          <button
            onClick={handleOpenOptions}
            className="w-full inline-flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-base">⚙️</span>
              <span>Extension Settings</span>
            </span>
            <span className="text-gray-400">↗</span>
          </button>
        </div>

        <div className="mt-3 text-center text-[11px] text-gray-400">
          <button
            className="hover:text-gray-600"
            onClick={() => openInNewTab(WEBSITE_URL)}
          >
            user64bit.wtf
          </button>
        </div>
      </section>
    </main>
  )
}

export default Popup
