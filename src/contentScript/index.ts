interface Bookmark {
  id: number
  title: string
  url: string
  createdAt: string
}

interface ChatGPTStorageData {
  chatgptBookmarks?: Bookmark[]
}

type ChromeStorageData = { [key: string]: any }

function initializeBookmarkFeature(): void {
  addBookmarkButton()
  checkCurrentPageBookmarkStatus()

  const observer = new MutationObserver(() => {
    if (!document.querySelector('button[aria-label="Bookmark"]')) {
      addBookmarkButton()
    }

    checkCurrentPageBookmarkStatus()
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

function addBookmarkButton(): void {
  const shareButton = document.querySelector('button[aria-label="Share"]')

  if (!shareButton) {
    setTimeout(addBookmarkButton, 1000)
    return
  }

  if (document.querySelector('button[aria-label="Bookmark"]')) {
    return
  }

  const bookmarkButton = document.createElement('button')
  bookmarkButton.setAttribute('aria-label', 'Bookmark')
  bookmarkButton.className = shareButton.className

  updateBookmarkButtonState(bookmarkButton)

  bookmarkButton.addEventListener('click', () => {
    handleBookmarkClick(bookmarkButton)
  })

  shareButton.parentNode?.insertBefore(bookmarkButton, shareButton)

  addBookmarkSidebar()
}

function updateBookmarkButtonState(button: HTMLButtonElement): void {
  const url = window.location.href

  chrome.storage.sync.get('chatgptBookmarks', (data: ChromeStorageData) => {
    const bookmarks = data.chatgptBookmarks || []
    const isBookmarked = bookmarks.some((b: Bookmark) => b.url === url)

    if (isBookmarked) {
      button.innerHTML = `
        <div class="flex items-center justify-center gap-2" style="pointer-events: none;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Bookmarked</span>
        </div>
      `
      button.classList.add('bookmarked')
    } else {
      button.innerHTML = `
        <div class="flex items-center justify-center gap-2" style="pointer-events: none;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Bookmark</span>
        </div>
      `
      button.classList.remove('bookmarked')
    }
  })
}

function handleBookmarkClick(button: HTMLButtonElement): void {
  const allHrefs = document.querySelectorAll('ol a')
  const hrefs = Array.from(allHrefs).filter(
    (href) =>
      href.hasAttribute('href') &&
      href.getAttribute('href')?.includes(`/c/${window.location.href.split('/').pop()}`),
  )

  let title = 'Untitled Conversation'
  if (hrefs[0]) {
    const divWithTitle = hrefs[0].querySelector('div[title]')
    if (divWithTitle && divWithTitle.getAttribute('title')) {
      title = divWithTitle.getAttribute('title') || title
    } else {
      title = hrefs[0].textContent || title
    }
  }

  const url = window.location.href

  chrome.storage.sync.get('chatgptBookmarks', (data: ChromeStorageData) => {
    const bookmarks = data.chatgptBookmarks || []
    const existingIndex = bookmarks.findIndex((b: Bookmark) => b.url === url)

    if (existingIndex >= 0) {
      bookmarks.splice(existingIndex, 1)
      chrome.storage.sync.set({ chatgptBookmarks: bookmarks }, () => {
        updateBookmarkButtonState(button)
        showBookmarkConfirmation(`"${title}" removed from bookmarks`)
      })
    } else {
      bookmarks.push({
        id: Date.now(),
        title,
        url,
        createdAt: new Date().toISOString(),
      })

      chrome.storage.sync.set({ chatgptBookmarks: bookmarks }, () => {
        updateBookmarkButtonState(button)
        showBookmarkConfirmation(`"${title}" bookmarked successfully!!!!`)
      })
    }
  })
}

function showBookmarkConfirmation(message: string): void {
  const toast = document.createElement('div')
  toast.className =
    'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center'
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3000)
}

// Sidebar functions
function addBookmarkSidebar(): void {
  if (document.getElementById('bookmark-sidebar-toggle')) {
    return
  }

  const toggleButton = document.createElement('button')
  toggleButton.id = 'bookmark-sidebar-toggle'
  toggleButton.className =
    'fixed right-0 top-1/2 -translate-y-1/2 bg-[#212121] hover:bg-[#212121] p-2 rounded-l-md shadow-md z-40 transition-transform duration-300'
  toggleButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `

  const sidebar = document.createElement('div')
  sidebar.id = 'bookmark-sidebar'
  sidebar.className =
    'fixed right-0 top-0 w-80 h-full bg-black shadow-lg transform translate-x-full transition-transform duration-300 ease-in-out z-30 flex flex-col'
  sidebar.innerHTML = `
    <div class="p-4 border-b flex justify-between items-center">
      <h2 class="text-lg font-medium">Bookmarks</h2>
      <button id="close-sidebar" class="p-1 rounded">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div id="bookmarks-list" class="flex-1 overflow-y-auto p-4">
      <div class="text-center py-4 text-gray-500">Loading bookmarks...</div>
    </div>
  `

  document.body.appendChild(toggleButton)
  document.body.appendChild(sidebar)

  const style = document.createElement('style')
  style.textContent = `
    #bookmark-sidebar.open {
      transform: translateX(0) !important;
    }
    #bookmark-sidebar:not(.open) {
      transform: translateX(100%) !important;
    }
    #bookmark-sidebar-toggle.open svg {
      transform: rotate(180deg);
    }
  `
  document.head.appendChild(style)

  toggleButton.addEventListener('click', () => {
    const sidebarElement = document.getElementById('bookmark-sidebar')
    const toggleElement = document.getElementById('bookmark-sidebar-toggle')

    if (sidebarElement && toggleElement) {
      // Toggle the sidebar state
      const isOpen = sidebarElement.classList.contains('open')

      if (isOpen) {
        sidebarElement.classList.remove('open')
        toggleElement.classList.remove('open')
      } else {
        sidebarElement.classList.add('open')
        toggleElement.classList.add('open')
        loadBookmarks()
      }
    }
  })

  document.getElementById('close-sidebar')?.addEventListener('click', () => {
    const sidebarElement = document.getElementById('bookmark-sidebar')
    const toggleElement = document.getElementById('bookmark-sidebar-toggle')

    if (sidebarElement) {
      sidebarElement.classList.remove('open')
    }

    if (toggleElement) {
      toggleElement.classList.remove('open')
    }
  })

  // Ensure sidebar is initially hidden
  const sidebarElement = document.getElementById('bookmark-sidebar')
  const toggleElement = document.getElementById('bookmark-sidebar-toggle')

  if (sidebarElement) {
    sidebarElement.classList.remove('open')
  }

  if (toggleElement) {
    toggleElement.classList.remove('open')
  }
}

function loadBookmarks(): void {
  const listElement = document.getElementById('bookmarks-list')
  if (!listElement) return

  chrome.storage.sync.get('chatgptBookmarks', (data: ChromeStorageData) => {
    const bookmarks = data.chatgptBookmarks || []

    if (bookmarks.length === 0) {
      listElement.innerHTML = `<div class="text-center py-4 text-gray-500">No bookmarks yet</div>`
      return
    }

    bookmarks.sort(
      (a: Bookmark, b: Bookmark) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    let html = ''
    bookmarks.forEach((bookmark: Bookmark) => {
      const date = new Date(bookmark.createdAt)
      const formattedDate = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })

      html += `
        <div class="py-3 px-2 border-b cursor-pointer" data-url="${bookmark.url}">
          <div class="font-medium truncate" title="${bookmark.title}">${bookmark.title}</div>
          <div class="text-xs text-gray-500 mt-1">${formattedDate}</div>
          <div class="flex gap-2 mt-2">
            <button class="open-btn flex items-center gap-1 px-2 py-1 text-xs bg-[#212121] hover:bg-[#212121] rounded" data-url="${bookmark.url}">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Open
            </button>
            <button class="delete-btn flex items-center gap-1 px-2 py-1 text-xs bg-[#212121] hover:bg-[#212121] rounded" data-id="${bookmark.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Remove
            </button>
          </div>
        </div>
      `
    })

    listElement.innerHTML = html

    attachBookmarkEventListeners(listElement)
  })
}

function attachBookmarkEventListeners(listElement: HTMLElement): void {
  listElement.querySelectorAll('[data-url]').forEach((item) => {
    if (!item.classList.contains('open-btn')) {
      const url = item.getAttribute('data-url')
      if (url) {
        item.addEventListener('click', (e) => {
          if (!(e.target as HTMLElement).closest('button')) {
            window.open(url, '_blank')
          }
        })
      }
    }
  })

  listElement.querySelectorAll('.open-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      const url = (e.currentTarget as HTMLButtonElement).getAttribute('data-url')
      if (url) {
        window.open(url, '_blank')
      }
    })
  })

  listElement.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')
      if (id) {
        deleteBookmark(parseInt(id))
      }
    })
  })
}

function deleteBookmark(id: number): void {
  chrome.storage.sync.get('chatgptBookmarks', (data: ChromeStorageData) => {
    let bookmarks = data.chatgptBookmarks || []

    const bookmarkToDelete = bookmarks.find((b: Bookmark) => b.id === id)
    bookmarks = bookmarks.filter((b: Bookmark) => b.id !== id)

    chrome.storage.sync.set({ chatgptBookmarks: bookmarks }, () => {
      loadBookmarks()

      const bookmarkButton = document.querySelector(
        'button[aria-label="Bookmark"]',
      ) as HTMLButtonElement

      if (bookmarkButton) {
        updateBookmarkButtonState(bookmarkButton)
      }

      if (bookmarkToDelete) {
        showBookmarkConfirmation(`"${bookmarkToDelete.title}" removed from bookmarks`)
      }
    })
  })
}

function checkCurrentPageBookmarkStatus(): void {
  const bookmarkButton = document.querySelector(
    'button[aria-label="Bookmark"]',
  ) as HTMLButtonElement

  if (bookmarkButton) {
    updateBookmarkButtonState(bookmarkButton)
  }
}

// Initialize bookmarking functionality
initializeBookmarkFeature()
