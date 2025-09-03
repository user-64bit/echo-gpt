interface Bookmark {
  id: number
  title: string
  url: string
  createdAt: string
  pinned: boolean
}

interface ChatGPTStorageData {
  chatgptBookmarks?: Bookmark[]
}

type ChromeStorageData = { [key: string]: any }

function initializeBookmarkFeature(): void {

  addBookmarkSidebar()
  checkCurrentPageBookmarkStatus()

  if (isConversationPage()) {
    addBookmarkButton()
    checkCurrentPageBookmarkStatus()
  }

  const observer = new MutationObserver((mutations) => {
    // Debounce the mutations to avoid excessive processing
    clearTimeout(window.echoGptMutationTimeout)
    window.echoGptMutationTimeout = setTimeout(() => {
      if (isConversationPage()) {
        // Only add button if it doesn't exist
        if (!document.querySelector('[data-echo-gpt="bookmark-button"]')) {
          addBookmarkButton()
        }
        checkCurrentPageBookmarkStatus()
      }
    }, 100)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false, // Reduce noise
    characterData: false // Reduce noise
  })

  // Also listen for navigation changes (for SPAs)
  let lastUrl = location.href
  new MutationObserver(() => {
    const url = location.href
    if (url !== lastUrl) {
      lastUrl = url
      setTimeout(() => {
        if (isConversationPage()) {
          addBookmarkButton()
          checkCurrentPageBookmarkStatus()
        }
      }, 500) // Give time for the new page to load
    }
  }).observe(document, { subtree: true, childList: true })
}

function findActionButtonsContainer(): Element | null {
  // Try multiple selectors to find the action buttons container
  const selectors = [
    'button[aria-label="Share"]', // Original share button
    'button[aria-label*="share" i]', // Case insensitive share button
    '[role="button"][aria-label*="Share"]', // Role-based selector
    'button[data-testid*="share"]', // Test ID based
    'button svg[viewBox*="24"]', // SVG-based fallback - look for buttons with 24x24 SVGs
    '[class*="share" i] button', // Class name containing "share"
    // Broader fallbacks - look for button containers in conversation areas
    '[data-testid*="conversation"] button',
    'main button', // Very broad fallback
  ]

  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) {
      return element
    }
  }

  return null
}

function addBookmarkButton(): void {
  // Check if bookmark button already exists
  if (document.querySelector('button[aria-label="Bookmark"], [data-echo-gpt="bookmark-button"]')) {
    return
  }

  const actionButton = findActionButtonsContainer()

  if (!actionButton) {
    setTimeout(addBookmarkButton, 1000)
    return
  }

  const bookmarkButton = document.createElement('button')
  bookmarkButton.setAttribute('aria-label', 'Bookmark')
  bookmarkButton.setAttribute('data-echo-gpt', 'bookmark-button') // Custom attribute to track our button

  // Copy classes from the reference button, but ensure it looks like a proper action button
  if (actionButton instanceof HTMLButtonElement) {
    bookmarkButton.className = actionButton.className
  } else {
    // Fallback styling if we can't find a proper reference
    bookmarkButton.className = 'flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
  }

  updateBookmarkButtonState(bookmarkButton)

  bookmarkButton.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    handleBookmarkClick(bookmarkButton)
  })

  // Try to insert the button near the action button
  const container = actionButton.parentNode
  if (container) {
    container.insertBefore(bookmarkButton, actionButton)
  } else {
    // Fallback: append to a common container
    const fallbackContainer = document.querySelector('main') || document.body
    fallbackContainer.appendChild(bookmarkButton)
  }
}

function updateBookmarkButtonState(button: HTMLButtonElement): void {
  const url = window.location.href

  chrome.storage.sync.get('chatgptBookmarks', (data: ChromeStorageData) => {
    const bookmarks = data.chatgptBookmarks || []
    const isBookmarked = bookmarks.some((b: Bookmark) => b.url === url)

    if (isBookmarked) {
      button.innerHTML = `
        <div class="flex items-center justify-center gap-2" style="pointer-events: none;">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Bookmarked</span>
        </div>
      `
      button.classList.add('bookmarked')
    } else {
      button.innerHTML = `
        <div class="flex items-center justify-center gap-2" style="pointer-events: none;">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Bookmark</span>
        </div>
      `
      button.classList.remove('bookmarked')
    }
  })
}

function extractConversationTitle(): string {
  // Multiple strategies to get the conversation title
  const strategies = [
    // Strategy 1: Look for page title or meta title
    () => {
      const titleElement = document.querySelector('title')
      const title = titleElement?.textContent
      if (title && !title.includes('ChatGPT') && title.trim().length > 0) {
        return title.trim()
      }
      return null
    },

    // Strategy 2: Look for heading elements that might contain the conversation title
    () => {
      const headings = document.querySelectorAll('h1, h2, h3, [role="heading"]')
      for (const heading of headings) {
        const text = heading.textContent?.trim()
        if (text && text.length > 3 && !text.toLowerCase().includes('chatgpt')) {
          return text
        }
      }
      return null
    },

    // Strategy 3: Look in navigation/sidebar for current conversation
    () => {
      const currentUrl = window.location.pathname
      const conversationId = currentUrl.split('/').pop()

      if (conversationId) {
        // Look for links that match current conversation
        const navLinks = document.querySelectorAll('nav a, [role="navigation"] a, ol a, ul a')
        for (const link of navLinks) {
          const href = link.getAttribute('href')
          if (href?.includes(conversationId)) {
            const text = link.textContent?.trim()
            if (text && text.length > 1) {
              return text
            }
          }
        }
      }
      return null
    },

    // Strategy 4: Look for any text content that might be the conversation title
    () => {
      const titleSelectors = [
        'span[dir="auto"]',
        '[data-testid*="conversation"] span',
        '[data-testid*="title"]',
        '.conversation-title',
        '[class*="title"]'
      ]

      for (const selector of titleSelectors) {
        const elements = document.querySelectorAll(selector)
        for (const element of elements) {
          const text = element.textContent?.trim()
          if (text && text.length > 3 && text.length < 100) {
            return text
          }
        }
      }
      return null
    },

    // Strategy 5: Extract from URL or use timestamp
    () => {
      const conversationId = window.location.pathname.split('/').pop()
      if (conversationId && conversationId !== 'c') {
        return `Conversation ${conversationId.substring(0, 8)}`
      }
      return `Conversation ${new Date().toLocaleDateString()}`
    }
  ]

  // Try each strategy until one works
  for (const strategy of strategies) {
    try {
      const title = strategy()
      if (title) {
        return title
      }
    } catch (error) {
      console.warn('Echo GPT: Title extraction strategy failed:', error)
    }
  }

  return 'Untitled Conversation'
}

function isConversationPage(): boolean {
  // Multiple ways to detect if we're on a conversation page
  return (
    window.location.href.includes('/c/') || // Original pattern
    window.location.pathname.startsWith('/c/') || // Path-based
    document.querySelector('[data-testid*="conversation"]') !== null || // Test ID based
    document.querySelector('main[class*="conversation"]') !== null || // Class based
    document.title.includes('ChatGPT') // Fallback
  )
}

function handleBookmarkClick(button: HTMLButtonElement): void {
  if (!isConversationPage()) {
    return
  }

  const title = extractConversationTitle()
  const url = window.location.href

  chrome.storage.sync.get('chatgptBookmarks', (data: ChromeStorageData) => {
    const bookmarks = data.chatgptBookmarks || []
    const existingIndex = bookmarks.findIndex((b: Bookmark) => b.url === url)

    if (existingIndex >= 0) {
      bookmarks.splice(existingIndex, 1)
      chrome.storage.sync.set({ chatgptBookmarks: bookmarks }, () => {
        updateBookmarkButtonState(button)
        showBookmarkConfirmation(`"${title}" removed from bookmarks`, 'removed')
      })
    } else {
      bookmarks.push({
        id: Date.now(),
        title,
        url,
        createdAt: new Date().toISOString(),
        pinned: false,
      })

      chrome.storage.sync.set({ chatgptBookmarks: bookmarks }, () => {
        updateBookmarkButtonState(button)
        showBookmarkConfirmation(`"${title}" bookmarked successfully!!!!`, 'added')
      })
    }
  })
}

function showBookmarkConfirmation(message: string, type: 'added' | 'removed' = 'added'): void {
  const toast = document.createElement('div')

  const isAdded = type === 'added'
  const bgColor = isAdded ? 'rgb(33,32,32)' : 'rgb(45, 33, 33)'
  const borderColor = isAdded ? 'rgb(16, 163, 127)' : 'rgb(239, 68, 68)'
  const iconColor = isAdded ? 'rgb(16, 163, 127)' : 'rgb(239, 68, 68)'

  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: ${bgColor};
    color: rgb(217, 217, 227);
    border: 1px solid ${borderColor};
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    min-width: 280px;
    max-width: 400px;
    text-align: center;
  `

  const icon = isAdded
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
         <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
         <polyline points="22 4 12 14.01 9 11.01"></polyline>
       </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
         <circle cx="12" cy="12" r="10"></circle>
         <path d="m15 9-6 6"></path>
         <path d="m9 9 6 6"></path>
       </svg>`

  toast.innerHTML = `
    ${icon}
    <span style="flex: 1;">${message}</span>
  `

  document.body.appendChild(toast)

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(-50%) translateY(0)'
  })

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(-50%) translateY(-10px)'
    setTimeout(() => {
      toast.remove()
    }, 300)
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
    'fixed right-0 top-1/2 bg-[#2A2A2A] hover:bg-[#3A3A3A] p-2.5 rounded-l-md shadow-lg transition-all duration-300'
  toggleButton.style.cssText = `
    position: fixed !important;
    right: 0 !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    z-index: 999999 !important;
    background: linear-gradient(135deg, #2d333b 0%, #1c2128 100%) !important;
    color: #f0f6fc !important;
    border: 1px solid #30363d !important;
    cursor: pointer !important;
    padding: 12px !important;
    border-radius: 8px 0 0 8px !important;
    box-shadow: -4px 0 16px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.2) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    backdrop-filter: blur(8px) !important;
  `
  toggleButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform duration-300">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  `

  const sidebar = document.createElement('div')
  sidebar.id = 'bookmark-sidebar'
  sidebar.className =
    'fixed right-0 top-0 w-80 h-full bg-black shadow-xl flex flex-col'
  sidebar.style.cssText = `
    position: fixed !important;
    right: 0 !important;
    top: 0 !important;
    width: 350px !important;
    height: 100vh !important;
    background: linear-gradient(145deg, #1a1a1a 0%, #0d1117 100%) !important;
    z-index: 999998 !important;
    transform: translateX(100%) !important;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    box-shadow: -8px 0 32px rgba(0,0,0,0.6), -4px 0 16px rgba(0,0,0,0.4) !important;
    display: flex !important;
    flex-direction: column !important;
    border-left: 1px solid #30363d !important;
    backdrop-filter: blur(8px) !important;
  `
  sidebar.innerHTML = `
    <div style="
      padding: 20px 24px; 
      border-bottom: 1px solid #30363d; 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="color: #58a6ff;">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <h2 style="font-size: 20px; font-weight: 600; color: #f0f6fc; margin: 0; letter-spacing: -0.02em;">Bookmarks</h2>
      </div>
      <button id="close-sidebar" style="
        padding: 8px; 
        border-radius: 8px; 
        background: transparent; 
        border: none; 
        cursor: pointer; 
        color: #8b949e; 
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div id="bookmarks-list" style="
      flex: 1; 
      overflow-y: auto; 
      padding: 16px;
      background: rgba(0,0,0,0.2);
    ">
      <div style="
        text-align: center; 
        padding: 32px 16px; 
        color: #8b949e;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.5;">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>Loading bookmarks...</span>
      </div>
    </div>
  `

  document.body.appendChild(toggleButton)
  document.body.appendChild(sidebar)

  // Debug: Verify sidebar was added

  // Attach close button event listener after sidebar is added to DOM
  const closeButton = document.getElementById('close-sidebar')
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()

      const sidebarElement = document.getElementById('bookmark-sidebar')
      const toggleElement = document.getElementById('bookmark-sidebar-toggle')

      if (sidebarElement) {
        sidebarElement.classList.remove('echo-gpt-open')
        sidebarElement.style.transform = 'translateX(100%)'
      }

      if (toggleElement) {
        toggleElement.classList.remove('echo-gpt-open')
        // Show toggle button when sidebar is closed
        toggleElement.style.opacity = '1'
        toggleElement.style.pointerEvents = 'auto'
        toggleElement.style.transform = 'translateY(-50%)'
      }
    })
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = '#30363d'
      closeButton.style.color = '#f0f6fc'
      closeButton.style.transform = 'scale(1.1)'
    })
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent'
      closeButton.style.color = '#8b949e'
      closeButton.style.transform = 'scale(1)'
    })
  }

  const style = document.createElement('style')
  style.textContent = `
    #bookmark-sidebar.echo-gpt-open {
      transform: translateX(0) !important;
    }
    #bookmark-sidebar:not(.echo-gpt-open) {
      transform: translateX(100%) !important;
    }
    #bookmark-sidebar-toggle.echo-gpt-open svg {
      transform: rotate(180deg) !important;
    }
    #bookmark-sidebar-toggle:hover {
      background: linear-gradient(135deg, #3d444d 0%, #2d333b 100%) !important;
      transform: translateY(-50%) scale(1.05) !important;
      box-shadow: -6px 0 20px rgba(0,0,0,0.5), 0 6px 12px rgba(0,0,0,0.3) !important;
    }
    #bookmark-sidebar-toggle:active {
      transform: translateY(-50%) scale(0.95) !important;
    }
    #bookmarks-list::-webkit-scrollbar {
      width: 8px;
    }
    #bookmarks-list::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.1);
      border-radius: 4px;
    }
    #bookmarks-list::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #30363d 0%, #21262d 100%);
      border-radius: 4px;
      border: 1px solid #21262d;
    }
    #bookmarks-list::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #3d444d 0%, #30363d 100%);
    }
    /* Override any conflicting styles from ChatGPT */
    #bookmark-sidebar * {
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif !important;
    }
    /* Smooth animations for all echo-gpt elements */
    [id*="echo-gpt"], [data-echo-gpt] {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
  `
  document.head.appendChild(style)

  toggleButton.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()

    const sidebarElement = document.getElementById('bookmark-sidebar')
    const toggleElement = document.getElementById('bookmark-sidebar-toggle')

    if (sidebarElement && toggleElement) {
      // Debug: Check current styles

      // Toggle the sidebar state
      const isOpen = sidebarElement.classList.contains('echo-gpt-open')

      if (isOpen) {
        sidebarElement.classList.remove('echo-gpt-open')
        toggleElement.classList.remove('echo-gpt-open')
        // Force transform to hide sidebar
        sidebarElement.style.transform = 'translateX(100%)'
        // Show toggle button when sidebar is closed
        toggleElement.style.opacity = '1'
        toggleElement.style.pointerEvents = 'auto'
        toggleElement.style.transform = 'translateY(-50%)'
      } else {
        sidebarElement.classList.add('echo-gpt-open')
        toggleElement.classList.add('echo-gpt-open')
        // Force transform to show sidebar
        sidebarElement.style.transform = 'translateX(0)'
        // Hide toggle button when sidebar is open
        toggleElement.style.opacity = '0'
        toggleElement.style.pointerEvents = 'none'
        loadBookmarks()
      }
    } else {
      console.error('Echo GPT: Could not find sidebar elements')
    }
  })


  // Ensure sidebar is initially hidden and toggle button is visible
  const sidebarElement = document.getElementById('bookmark-sidebar')
  const toggleElement = document.getElementById('bookmark-sidebar-toggle')

  if (sidebarElement) {
    sidebarElement.classList.remove('echo-gpt-open')
    sidebarElement.style.transform = 'translateX(100%)'
  }

  if (toggleElement) {
    toggleElement.classList.remove('echo-gpt-open')
    // Ensure toggle button is visible initially
    toggleElement.style.opacity = '1'
    toggleElement.style.pointerEvents = 'auto'
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

    bookmarks.sort((a: Bookmark, b: Bookmark) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    let html = ''
    bookmarks.forEach((bookmark: Bookmark) => {
      const date = new Date(bookmark.createdAt)
      const formattedDate = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })

      html += `
        <div class="bookmark-item group relative p-4 mb-3 rounded-xl transition-all duration-300 cursor-pointer ${bookmark.pinned ? 'pinned-bookmark' : 'regular-bookmark'}" data-url="${bookmark.url}" style="
          background: linear-gradient(135deg, ${bookmark.pinned ? '#1a2332' : '#1a1a1a'} 0%, ${bookmark.pinned ? '#0f1419' : '#121212'} 100%);
          border: 1px solid ${bookmark.pinned ? '#2563eb40' : '#333333'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1);
          transform: translateY(0);
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)'; this.style.borderColor='${bookmark.pinned ? '#3b82f6' : '#4a5568'}';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)'; this.style.borderColor='${bookmark.pinned ? '#2563eb40' : '#333333'}';">
          ${bookmark.pinned ? `
            <div class="absolute top-3 right-3 flex items-center justify-center w-6 h-6 bg-blue-500 bg-opacity-20 rounded-full">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="color: #3b82f6;">
                <path d="M16 3V5H18V9L21 12V13H14V21H10V13H3V12L6 9V5H8V3H16Z"/>
              </svg>
            </div>
          ` : ''}
          <div class="flex items-start gap-3 mb-3">
            <div class="flex-shrink-0 mt-1">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="
                background: linear-gradient(135deg, ${bookmark.pinned ? '#3b82f6' : '#4a5568'} 0%, ${bookmark.pinned ? '#1e40af' : '#2d3748'} 100%);
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
              ">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="color: white;">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-white text-sm leading-5 mb-1" style="
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                line-height: 1.4;
              " title="${bookmark.title}">${bookmark.title}</h3>
              <div class="flex items-center gap-2 text-xs" style="color: #9ca3af;">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>${formattedDate}</span>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="open-btn flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95" 
              style="background: linear-gradient(135deg, #059669 0%, #047857 100%); box-shadow: 0 2px 4px rgba(5,150,105,0.3);" 
              onmouseover="this.style.background='linear-gradient(135deg, #10b981 0%, #059669 100%)'; this.style.boxShadow='0 4px 8px rgba(5,150,105,0.4)';"
              onmouseout="this.style.background='linear-gradient(135deg, #059669 0%, #047857 100%)'; this.style.boxShadow='0 2px 4px rgba(5,150,105,0.3)';"
              data-url="${bookmark.url}">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Open
            </button>
            <button class="delete-btn flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95" 
              style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); box-shadow: 0 2px 4px rgba(107,114,128,0.3);"
              onmouseover="this.style.background='linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'; this.style.boxShadow='0 4px 8px rgba(220,38,38,0.4)';"
              onmouseout="this.style.background='linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'; this.style.boxShadow='0 2px 4px rgba(107,114,128,0.3)';" data-id="${bookmark.id}">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Remove
            </button>
            <button class="pin-btn flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95" 
              style="background: ${bookmark.pinned ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'}; 
                     color: white; 
                     box-shadow: 0 2px 4px ${bookmark.pinned ? 'rgba(220,38,38,0.3)' : 'rgba(59,130,246,0.3)'};"
              onmouseover="this.style.background='${bookmark.pinned ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)'}'; this.style.boxShadow='0 4px 8px ${bookmark.pinned ? 'rgba(220,38,38,0.4)' : 'rgba(59,130,246,0.4)'}';"
              onmouseout="this.style.background='${bookmark.pinned ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'}'; this.style.boxShadow='0 2px 4px ${bookmark.pinned ? 'rgba(220,38,38,0.3)' : 'rgba(59,130,246,0.3)'}';" data-id="${bookmark.id}">
              ${bookmark.pinned
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 3V5H18V9L21 12V13H14V21H10V13H3V12L6 9V5H8V3H16Z"/>
                    </svg>`
          : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 3V5H18V9L21 12V13H14V21H10V13H3V12L6 9V5H8V3H16Z"/>
                    </svg>`
        }
              ${bookmark.pinned ? 'Unpin' : 'Pin'}
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
  listElement.querySelectorAll('.pin-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = (e.currentTarget as HTMLButtonElement).getAttribute('data-id')
      if (id) {
        pinBookmark(parseInt(id))
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
        'button[aria-label="Bookmark"], [data-echo-gpt="bookmark-button"]',
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
function pinBookmark(id: number): void {
  chrome.storage.sync.get('chatgptBookmarks', (data: ChromeStorageData) => {
    let bookmarks = data.chatgptBookmarks || []
    const bookmarkToPin = bookmarks.find((b: Bookmark) => b.id === id)
    bookmarkToPin.pinned = !bookmarkToPin.pinned
    bookmarks = bookmarks.filter((b: Bookmark) => b.id !== id)
    bookmarks.unshift(bookmarkToPin)

    chrome.storage.sync.set({ chatgptBookmarks: bookmarks }, () => {
      loadBookmarks()
    })
  })
}

function checkCurrentPageBookmarkStatus(): void {
  const bookmarkButton = document.querySelector(
    'button[aria-label="Bookmark"], [data-echo-gpt="bookmark-button"]',
  ) as HTMLButtonElement

  if (bookmarkButton) {
    updateBookmarkButtonState(bookmarkButton)
  }
}

// Initialize bookmarking functionality
initializeBookmarkFeature()
