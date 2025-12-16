console.log('🔥 bullydetector.js LOADED!')

// ============================================
// CONFIGURATION - GANTI API URL DI SINI!
// ============================================
const CONFIG = {
  // 🔧 GANTI DENGAN NGROK URL ANDA
  API_URL: 'https://06f7982ed2ad.ngrok-free.app', // ← HAPUS /detect

  // Optional settings
  AUTO_START: false, // ← Jangan auto-start di sini
  BATCH_DELAY: 500,
  TAGS_TO_MONITOR: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'li'],
  DEBUG_MODE: true,

  // Intersection Observer settings
  OBSERVER_OPTIONS: {
    rootMargin: '50px',
    threshold: 0.1,
  },
}

console.log('🔥 CONFIG loaded:', CONFIG)

class BullyingDetector {
  constructor(apiUrl) {
    this.apiUrl = apiUrl || CONFIG.API_URL // Fallback ke CONFIG jika tidak ada
    this.textTags = [
      'div',
      'span',
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'a',
      'li',
      'td',
      'th',
      'label',
      'button',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'small',
      'mark',
      'del',
      'ins',
      'sub',
      'sup',
    ]

    // State management
    this.pendingElements = new Map() // Elements yang belum diproses
    this.processedElements = new Set() // Elements yang sudah diproses
    this.batchTimer = null
    this.batchDelay = CONFIG.BATCH_DELAY || 500 // 500ms delay default
    this.observer = null
    this.isProcessing = false
    this.debugMode = CONFIG.DEBUG_MODE || false

    // Statistics
    this.stats = {
      total: 0,
      bullying: 0,
      nonBullying: 0,
      errors: 0,
    }

    this.initStyles()
  }

  /**
   * Inject CSS styles untuk bullying text
   */
  initStyles() {
    if (document.getElementById('sybau-styles')) return

    const style = document.createElement('style')
    style.id = 'sybau-styles'
    style.textContent = `
              .sybau {
                  color: #dc2626 !important;
                  background-color: #fee2e2 !important;
                  padding: 2px 4px !important;
                  border-radius: 3px !important;
                  border-left: 3px solid #dc2626 !important;
                  font-weight: 500 !important;
                  transition: all 0.3s ease !important;
              }
              
              .sybau:hover {
                  background-color: #fecaca !important;
                  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3) !important;
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
                  text-transform: uppercase;
              }
              
              .sybau-processing {
                  opacity: 0.6;
                  position: relative;
              }
              
              .sybau-processing::after {
                  content: '🔍';
                  position: absolute;
                  right: -20px;
                  top: 50%;
                  transform: translateY(-50%);
                  animation: sybau-pulse 1s infinite;
              }
              
              @keyframes sybau-pulse {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.3; }
              }
          `
    document.head.appendChild(style)
  }

  /**
   * Start intersection observer untuk detect visible elements
   */
  start(tags = null) {
    const tagsToObserve = tags || this.textTags

    if (this.debugMode) {
      console.log('🚀 Starting Bullying Detection...')
      console.log(`📡 API URL: ${this.apiUrl}`)
      console.log(`🏷️  Monitoring tags: ${tagsToObserve.join(', ')}`)
    }

    // Create intersection observer
    this.observer = new IntersectionObserver(
      (entries) => this.handleIntersection(entries),
      CONFIG.OBSERVER_OPTIONS || {
        root: null,
        rootMargin: '50px',
        threshold: 0.1,
      },
    )

    // Observe all elements with specified tags
    tagsToObserve.forEach((tag) => {
      const elements = document.querySelectorAll(tag)
      elements.forEach((element) => {
        const text = element.textContent.trim()
        // Hanya observe element yang punya text dan belum diproses
        if (text && text.length > 3 && !this.processedElements.has(element)) {
          this.observer.observe(element)
        }
      })
    })

    if (this.debugMode) {
      console.log('✅ Observer started successfully')
    }
  }

  /**
   * Handle intersection events
   */
  handleIntersection(entries) {
    let newElementsDetected = false

    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const element = entry.target
        const text = element.textContent.trim()

        // Skip jika sudah diproses atau text terlalu pendek
        if (this.processedElements.has(element) || text.length <= 3) {
          return
        }

        // Tambahkan ke pending batch
        if (!this.pendingElements.has(element)) {
          this.pendingElements.set(element, {
            element: element,
            text: text,
            author: this.extractAuthor(element),
            timestamp: new Date().toISOString(),
            element_id: this.generateElementId(element),
          })

          newElementsDetected = true

          // Visual feedback: element sedang diproses
          element.classList.add('sybau-processing')
        }

        // Stop observing element ini
        this.observer.unobserve(element)
      }
    })

    // Jika ada element baru, reset timer
    if (newElementsDetected) {
      this.resetBatchTimer()
    }
  }

  /**
   * Reset batch timer - akan process batch setelah delay
   */
  resetBatchTimer() {
    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    // Set new timer
    this.batchTimer = setTimeout(() => {
      this.processBatch()
    }, this.batchDelay)
  }

  /**
   * Process batch of pending elements
   */
  async processBatch() {
    if (this.isProcessing || this.pendingElements.size === 0) {
      return
    }

    this.isProcessing = true
    const batch = Array.from(this.pendingElements.values())

    if (this.debugMode) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🔍 Processing batch of ${batch.length} elements...`)
      console.log(`${'='.repeat(60)}`)
    }

    try {
      // Prepare request body sesuai format API
      const requestBody = {
        comments: batch.map((item) => ({
          text: item.text,
          author: item.author,
          timestamp: item.timestamp,
          element_id: item.element_id,
        })),
      }

      // Call API
      const response = await fetch(`${this.apiUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'API returned error')
      }

      if (this.debugMode) {
        console.log(`✅ API Response received:`)
        console.log(`   📊 Total: ${data.total_comments}`)
        console.log(`   🚨 Bullying: ${data.bullying_count}`)
        console.log(`   ✅ Non-Bullying: ${data.non_bullying_count}`)
        console.log(`   📈 Bullying %: ${data.bullying_percentage}%`)
      }

      // Apply results to elements
      this.applyResults(data.results)

      // Update stats
      this.stats.total += data.total_comments
      this.stats.bullying += data.bullying_count
      this.stats.nonBullying += data.non_bullying_count
    } catch (error) {
      console.error('❌ Error processing batch:', error)
      this.stats.errors += batch.length

      // Remove processing class dari semua elements
      batch.forEach((item) => {
        item.element.classList.remove('sybau-processing')
      })
    } finally {
      // Clear pending elements
      this.pendingElements.clear()
      this.isProcessing = false

      // Print stats
      if (this.debugMode) {
        this.printStats()
      }
    }
  }

  /**
   * Apply API results to elements
   */
  applyResults(results) {
    results.forEach((result) => {
      // Find element by element_id
      const element = this.findElementById(result.element_id)

      if (!element) {
        if (this.debugMode) {
          console.warn(`⚠️  Element not found: ${result.element_id}`)
        }
        return
      }

      // Remove processing class
      element.classList.remove('sybau-processing')

      // Mark as processed
      this.processedElements.add(element)

      // Apply styling if bullying detected
      if (result.is_bullying) {
        element.classList.add('sybau')

        // Add badge dengan confidence score
        const badge = document.createElement('span')
        badge.className = 'sybau-badge'
        badge.textContent = `⚠️ ${Math.round(result.confidence * 100)}%`
        badge.title = `Bullying detected with ${Math.round(result.confidence * 100)}% confidence`

        // Append badge jika belum ada
        if (!element.querySelector('.sybau-badge')) {
          element.appendChild(badge)
        }

        if (this.debugMode) {
          console.log(
            `🚨 BULLYING detected (${Math.round(result.confidence * 100)}%): "${result.text.substring(0, 50)}..."`,
          )
        }
      } else {
        if (this.debugMode) {
          console.log(`✅ Non-bullying: "${result.text.substring(0, 50)}..."`)
        }
      }

      // Store result in element data
      element.dataset.bullyingResult = JSON.stringify({
        prediction: result.prediction,
        confidence: result.confidence,
        is_bullying: result.is_bullying,
      })
    })
  }

  /**
   * Extract author from element (try to find nearby author info)
   */
  extractAuthor(element) {
    // Try to find author in common patterns
    const patterns = ['.author', '.username', '.user-name', '[data-author]', '[data-username]']

    let author = ''
    let current = element

    // Search in parent hierarchy
    for (let i = 0; i < 3; i++) {
      if (!current) break

      for (const pattern of patterns) {
        const authorElement = current.querySelector(pattern)
        if (authorElement) {
          author = authorElement.textContent.trim()
          break
        }
      }

      if (author) break
      current = current.parentElement
    }

    return author
  }

  /**
   * Generate unique element ID
   */
  generateElementId(element) {
    // Try to use existing ID
    if (element.id) {
      return element.id
    }

    // Generate based on xpath-like structure
    const getPath = (el) => {
      if (el === document.body) return 'body'

      let path = el.tagName.toLowerCase()
      if (el.className) {
        path += '.' + el.className.split(' ').join('.')
      }

      return path
    }

    let path = getPath(element)
    let parent = element.parentElement
    let depth = 0

    while (parent && depth < 3) {
      path = getPath(parent) + '>' + path
      parent = parent.parentElement
      depth++
    }

    // Add timestamp untuk uniqueness
    return `${path}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
  }

  /**
   * Find element by generated ID
   */
  findElementById(elementId) {
    // Check if it's a standard ID
    let element = document.getElementById(elementId)
    if (element) return element

    // Search in pending and processed elements
    for (const [el, data] of this.pendingElements) {
      if (data.element_id === elementId) return el
    }

    for (const el of this.processedElements) {
      if (el.dataset.bullyingResult) {
        const storedId = this.generateElementId(el)
        if (storedId === elementId) return el
      }
    }

    return null
  }

  /**
   * Print statistics
   */
  printStats() {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📊 STATISTICS`)
    console.log(`${'='.repeat(60)}`)
    console.log(`   Total Processed: ${this.stats.total}`)
    console.log(
      `   🚨 Bullying: ${this.stats.bullying} (${this.calculatePercentage(this.stats.bullying, this.stats.total)}%)`,
    )
    console.log(
      `   ✅ Non-Bullying: ${this.stats.nonBullying} (${this.calculatePercentage(this.stats.nonBullying, this.stats.total)}%)`,
    )
    console.log(`   ❌ Errors: ${this.stats.errors}`)
    console.log(`${'='.repeat(60)}\n`)
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(part, total) {
    if (total === 0) return 0
    return Math.round((part / total) * 100)
  }

  /**
   * Stop detection
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    console.log('🛑 Bullying detection stopped')
    this.printStats()
  }

  /**
   * Reset all
   */
  reset() {
    this.stop()

    // Remove all sybau classes
    document.querySelectorAll('.sybau').forEach((el) => {
      el.classList.remove('sybau')
      const badge = el.querySelector('.sybau-badge')
      if (badge) badge.remove()
    })

    document.querySelectorAll('.sybau-processing').forEach((el) => {
      el.classList.remove('sybau-processing')
    })

    // Clear state
    this.pendingElements.clear()
    this.processedElements.clear()
    this.stats = {
      total: 0,
      bullying: 0,
      nonBullying: 0,
      errors: 0,
    }

    console.log('🔄 Detector reset')
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats }
  }

  /**
   * Manually check specific elements
   */
  async checkElements(elements) {
    const batch = Array.from(elements).map((element) => ({
      element: element,
      text: element.textContent.trim(),
      author: this.extractAuthor(element),
      timestamp: new Date().toISOString(),
      element_id: this.generateElementId(element),
    }))

    // Add to pending
    batch.forEach((item) => {
      this.pendingElements.set(item.element, item)
      item.element.classList.add('sybau-processing')
    })

    // Process immediately
    await this.processBatch()
  }
}

// ============================================
// UTILITY FUNCTIONS & AUTO-INITIALIZATION
// ============================================

// Global detector instance
let globalDetector = null

/**
 * Initialize detector with API URL
 */
function initBullyingDetector(apiUrl, autoStart = true) {
  if (!apiUrl) {
    console.error('❌ API URL is required!')
    return null
  }

  globalDetector = new BullyingDetector(apiUrl)

  if (autoStart) {
    globalDetector.start()
  }

  return globalDetector
}

/**
 * Quick start function
 */
function startBullyingDetection(apiUrl) {
  return initBullyingDetector(apiUrl, true)
}

/**
 * Stop detection
 */
function stopBullyingDetection() {
  if (globalDetector) {
    globalDetector.stop()
  }
}

/**
 * Reset detection
 */
function resetBullyingDetection() {
  if (globalDetector) {
    globalDetector.reset()
  }
}

/**
 * Get statistics
 */
function getBullyingStats() {
  if (globalDetector) {
    return globalDetector.getStats()
  }
  return null
}

// ============================================
// BROWSER EXTENSION INTEGRATION
// ============================================

// Make it globally available
if (typeof window !== 'undefined') {
  window.BullyingDetector = BullyingDetector
  window.CONFIG = CONFIG
  console.log('🔥 BullyingDetector exposed to window')
}

// Export untuk Node.js/Module systems
// if (typeof module !== 'undefined' && module.exports) {
//   module.exports = {
//     BullyingDetector,
//     initBullyingDetector,
//     startBullyingDetection,
//     stopBullyingDetection,
//     resetBullyingDetection,
//     getBullyingStats,
//   }
// }

// ============================================
// DEMO & TESTING
// ============================================

/**
 * Demo function untuk testing
 */
function demonstrateBullyingDetection(apiUrl) {
  if (!apiUrl) {
    console.error('❌ Please provide API URL')
    console.log('💡 Example: demonstrateBullyingDetection("https://your-ngrok-url.ngrok.io")')
    return
  }

  console.log('🎬 Starting Bullying Detection Demo...')
  console.log(`📡 API: ${apiUrl}`)

  const detector = startBullyingDetection(apiUrl)

  console.log('\n✅ Detection started!')
  console.log('📝 Scroll the page to detect new text elements')
  console.log('🛑 To stop: stopBullyingDetection()')
  console.log('📊 To see stats: getBullyingStats()')
  console.log('🔄 To reset: resetBullyingDetection()')

  return detector
}

// ============================================
// AUTO-INITIALIZATION
// ============================================
// if (typeof window !== 'undefined' && typeof document !== 'undefined') {
//   // Wait for DOM ready
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initializeExtension)
//   } else {
//     // DOM already loaded
//     initializeExtension()
//   }
// }

// function initializeExtension() {
//   // Validate API URL
//   if (!CONFIG.API_URL || CONFIG.API_URL === 'https://your-ngrok-url.ngrok.io') {
//     console.warn('⚠️  Bullying Detector: Please configure API_URL in CONFIG')
//     console.log('💡 Edit the CONFIG object at the top of this file')
//     return
//   }

//   if (!CONFIG.AUTO_START) {
//     console.log('ℹ️  Bullying Detector loaded but not auto-started')
//     console.log('💡 Call startBullyingDetection() to start manually')
//     return
//   }

//   // Auto-start detection
//   try {
//     if (CONFIG.DEBUG_MODE) {
//       console.log('🚀 Initializing Bullying Detector Extension...')
//       console.log(`📡 API URL: ${CONFIG.API_URL}`)
//     }

//     globalDetector = new BullyingDetector(CONFIG.API_URL)
//     globalDetector.batchDelay = CONFIG.BATCH_DELAY

//     // Start dengan custom tags jika di-set
//     globalDetector.start(CONFIG.TAGS_TO_MONITOR)

//     if (CONFIG.DEBUG_MODE) {
//       console.log('✅ Bullying detection started successfully!')
//       console.log('📝 Monitoring text elements on this page...')
//     }
//   } catch (error) {
//     console.error('❌ Failed to initialize Bullying Detector:', error)
//   }
// }
