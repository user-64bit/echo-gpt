console.log('background is running')

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'hard-reload') return

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const activeTab = tabs?.[0]
    if (activeTab?.id !== undefined) {
      await chrome.tabs.reload(activeTab.id, { bypassCache: true })
    }
  } catch (error) {
    console.error('Hard reload command failed', error)
  }
})
