console.log('🚀 BULLYING DETECTOR STARTING...')

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  API_URL: 'https://28025fb4c0f5.ngrok-free.app',
  BATCH_DELAY: 1000, // Increased delay for better batching
  DEBUG_MODE: true,
  OBSERVER_OPTIONS: {
    rootMargin: '100px',
    threshold: 0.1,
  },
}

console.log('✅ CONFIG loaded')

// ============================================
// BULLYING DETECTOR CLASS (TWITTER OPTIMIZED)
// ============================================
class BullyingDetector {
  constructor(apiUrl) {
    console.log('🔧 Initializing BullyingDetector...')
    this.apiUrl = apiUrl
    
    // Twitter-specific selectors for tweet text
    this.tweetSelectors = [
      '[data-testid="tweetText"]',           // Main tweet text
      'div[lang]',                            // Tweet content divs with lang attribute
      'article div[dir="auto"]',              // Auto-direction divs in articles
    ]

    this.pendingElements = new Map()
    this.processedElements = new Set()
    this.batchTimer = null
    this.batchDelay = CONFIG.BATCH_DELAY
    this.intersectionObserver = null
    this.mutationObserver = null
    this.isProcessing = false
    this.debugMode = CONFIG.DEBUG_MODE

    this.stats = {
      total: 0,
      bullying: 0,
      nonBullying: 0,
      errors: 0,
    }

    this.initStyles()
    console.log('✅ BullyingDetector initialized')
  }

  initStyles() {
    if (document.getElementById('sybau-styles')) return

    const style = document.createElement('style')
    style.id = 'sybau-styles'
    style.textContent = `
        /* Processing state - blur while checking */
        .sybau-checking {
          filter: blur(5px) !important;
          transition: filter 0.3s ease !important;
          position: relative !important;
        }
        
        .sybau-checking::after {
          content: '🔍 Memeriksa...';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(59, 130, 246, 0.95);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
          animation: sybau-pulse 1.5s infinite;
        }
        
        /* Bullying detected - stays blurred with warning */
        .sybau-bullying {
          filter: blur(5px) !important;
          transition: filter 0.3s ease !important;
          position: relative !important;
          cursor: pointer !important;
          user-select: none !important;
        }
        
        .sybau-bullying:hover {
          filter: blur(2px) !important;
        }
        
        .sybau-bullying::before {
          content: '⚠️ Konten Bullying - Klik untuk lihat';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(220, 38, 38, 0.95);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 1000;
        }
        
        .sybau-bullying:hover::before {
          opacity: 1;
        }
        
        /* Revealed bullying content */
        .sybau-bullying.revealed {
          filter: blur(0px) !important;
          background-color: rgba(254, 226, 226, 0.3) !important;
          border-left: 3px solid #dc2626 !important;
          padding-left: 8px !important;
        }
        
        .sybau-bullying.revealed::before {
          content: '⚠️ Konten Bullying';
          opacity: 0;
        }
        
        /* Safe content - remove blur smoothly */
        .sybau-safe {
          filter: blur(0px) !important;
          transition: filter 0.5s ease !important;
        }
        
        .sybau-badge {
          display: inline-block;
          background: #dc2626;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 10px;
          margin-left: 6px;
          font-weight: bold;
          vertical-align: middle;
          filter: blur(0) !important;
        }
        
        @keyframes sybau-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `
    document.head.appendChild(style)
    console.log('✅ Styles injected')
  }

  start() {
    console.log('🚀 Starting detector for Twitter...')
    console.log(`📡 API URL: ${this.apiUrl}`)

    // Start intersection observer for visible tweets
    this.startIntersectionObserver()
    
    // Start mutation observer for dynamically loaded tweets
    this.startMutationObserver()

    // Process existing tweets
    this.scanExistingTweets()

    console.log('✅ All observers started')
  }

  startIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      CONFIG.OBSERVER_OPTIONS
    )
  }

  startMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      let newTweetsFound = false

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Check if node itself is a tweet element
            this.findAndObserveTweets(node)
            
            // Check children for tweet elements
            if (node.querySelectorAll) {
              this.tweetSelectors.forEach(selector => {
                const elements = node.querySelectorAll(selector)
                elements.forEach(el => {
                  if (this.shouldProcessElement(el)) {
                    this.intersectionObserver.observe(el)
                    newTweetsFound = true
                  }
                })
              })
            }
          }
        })
      })

      if (newTweetsFound && this.debugMode) {
        console.log('🆕 New tweets detected via MutationObserver')
      }
    })

    // Observe the main timeline
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    console.log('👀 MutationObserver started')
  }

  scanExistingTweets() {
    let count = 0
    this.tweetSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector)
      elements.forEach((element) => {
        if (this.shouldProcessElement(element)) {
          this.intersectionObserver.observe(element)
          count++
        }
      })
    })
    console.log(`📊 Found ${count} existing tweet elements to observe`)
  }

  findAndObserveTweets(node) {
    this.tweetSelectors.forEach(selector => {
      if (node.matches && node.matches(selector)) {
        if (this.shouldProcessElement(node)) {
          this.intersectionObserver.observe(node)
        }
      }
    })
  }

  shouldProcessElement(element) {
    const text = element.textContent.trim()
    return (
      text &&
      text.length > 5 &&
      !this.processedElements.has(element) &&
      !this.pendingElements.has(element)
    )
  }

  handleIntersection(entries) {
    let newElementsDetected = false

    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const element = entry.target
        const text = element.textContent.trim()

        if (this.processedElements.has(element) || text.length <= 5) {
          return
        }

        if (!this.pendingElements.has(element)) {
          // IMMEDIATELY BLUR while processing
          element.classList.add('sybau-checking')
          
          this.pendingElements.set(element, {
            element: element,
            text: text,
            author: this.extractAuthor(element),
            timestamp: new Date().toISOString(),
            element_id: this.generateElementId(element),
          })

          newElementsDetected = true

          if (this.debugMode) {
            console.log(`👁️ Tweet visible (BLURRED): "${text.substring(0, 50)}..."`)
          }
        }

        this.intersectionObserver.unobserve(element)
      }
    })

    if (newElementsDetected) {
      this.resetBatchTimer()
    }
  }

  extractAuthor(element) {
    try {
      // Try to find author from tweet article structure
      const article = element.closest('article')
      if (article) {
        const authorElement = article.querySelector('[data-testid="User-Name"]')
        if (authorElement) {
          return authorElement.textContent.trim()
        }
      }
      return 'Unknown'
    } catch (e) {
      return 'Unknown'
    }
  }

  resetBatchTimer() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    if (this.debugMode) {
      console.log(`⏱️ Batch timer set (${this.batchDelay}ms)`)
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatch()
    }, this.batchDelay)
  }

  async processBatch() {
    if (this.isProcessing || this.pendingElements.size === 0) {
      return
    }

    this.isProcessing = true
    const batch = Array.from(this.pendingElements.values())

    console.log(`\n${'='.repeat(60)}`)
    console.log(`🔍 Processing batch of ${batch.length} tweets...`)
    console.log(`${'='.repeat(60)}`)

    try {
      const requestBody = {
        comments: batch.map((item) => ({
          text: item.text,
          author: item.author,
          timestamp: item.timestamp,
          element_id: item.element_id,
        })),
      }

      console.log('📤 Sending to API:', `${this.apiUrl}/detect`)

      const response = await fetch(`${this.apiUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('📥 Response status:', response.status)

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      console.log('📥 Response data:', data)

      if (!data.success) {
        throw new Error(data.error || 'API error')
      }

      console.log(`✅ Total: ${data.total_comments}`)
      console.log(`🚨 Bullying: ${data.bullying_count}`)
      console.log(`✅ Non-Bullying: ${data.non_bullying_count}`)

      this.applyResults(data.results)

      this.stats.total += data.total_comments
      this.stats.bullying += data.bullying_count
      this.stats.nonBullying += data.non_bullying_count
    } catch (error) {
      console.error('❌ Error:', error)
      this.stats.errors += batch.length

      // On error, remove blur from all elements
      batch.forEach((item) => {
        item.element.classList.remove('sybau-checking')
        item.element.classList.add('sybau-safe')
      })
    } finally {
      this.pendingElements.clear()
      this.isProcessing = false
      console.log(`${'='.repeat(60)}\n`)
    }
  }

  applyResults(results) {
    results.forEach((result) => {
      const element = this.findElementById(result.element_id)

      if (!element) return

      // Remove checking state
      element.classList.remove('sybau-checking')
      this.processedElements.add(element)

      if (result.is_bullying) {
        // BULLYING: Keep blurred, change to bullying state
        element.classList.add('sybau-bullying')

        // Add click to reveal
        element.addEventListener('click', function revealHandler() {
          this.classList.add('revealed')
          this.removeEventListener('click', revealHandler)
        })

        const badge = document.createElement('span')
        badge.className = 'sybau-badge'
        badge.textContent = `⚠️ ${Math.round(result.confidence * 100)}%`

        if (!element.querySelector('.sybau-badge')) {
          element.appendChild(badge)
        }

        console.log(
          `🚨 BULLYING DETECTED (STAYS BLURRED): "${result.text.substring(0, 50)}..." (${Math.round(result.confidence * 100)}%)`
        )
      } else {
        // NOT BULLYING: Remove blur smoothly
        element.classList.add('sybau-safe')
        
        console.log(
          `✅ SAFE CONTENT (UNBLURRED): "${result.text.substring(0, 50)}..."`
        )
      }
    })
  }

  generateElementId(element) {
    if (element.id) return element.id
    
    // Generate unique ID and set it
    const id = `sybau_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    element.setAttribute('data-sybau-id', id)
    return id
  }

  findElementById(elementId) {
    // Try standard ID
    let element = document.getElementById(elementId)
    if (element) return element

    // Try custom data attribute
    element = document.querySelector(`[data-sybau-id="${elementId}"]`)
    if (element) return element

    // Try pending elements
    for (const [el, data] of this.pendingElements) {
      if (data.element_id === elementId) return el
    }

    return null
  }

  stop() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = null
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }
    console.log('🛑 Detector stopped')
  }

  getStats() {
    return { ...this.stats }
  }
}

console.log('✅ BullyingDetector class defined')

// ============================================
// INITIALIZATION
// ============================================
let detector = null

function initDetector() {
  console.log('🎯 Initializing detector for Twitter...')

  try {
    detector = new BullyingDetector(CONFIG.API_URL)
    
    // Wait a bit for Twitter to load initial content
    setTimeout(() => {
      detector.start()
      console.log('✅ Detector started successfully!')
    }, 2000)
    
  } catch (error) {
    console.error('❌ Init error:', error)
  }
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded')
    initDetector()
  })
} else {
  console.log('📄 DOM already ready')
  initDetector()
}

// Expose to window
window.bullyingDetector = {
  instance: () => detector,
  stats: () => (detector ? detector.getStats() : null),
  stop: () => (detector ? detector.stop() : null),
  rescan: () => {
    if (detector) {
      console.log('🔄 Rescanning...')
      detector.scanExistingTweets()
    }
  }
}

console.log('💡 Access via: window.bullyingDetector')
console.log('💡 Rescan: window.bullyingDetector.rescan()')
console.log('🎯 SCRIPT LOADED COMPLETELY!')