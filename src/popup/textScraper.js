class HTMLTextExtractor {
  constructor() {
    // Tag-tag yang umum mengandung teks
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

    // Intersection Observer instances
    this.observers = new Map()
    this.visibleElements = new Set()
    this.intersectionCallbacks = new Map()
  }

  /**
   * Ekstrak teks dari DOM element atau HTML string
   * @param {Element|string} source - DOM element atau HTML string
   * @param {string[]} specificTags - Tag spesifik yang ingin diekstrak (opsional)
   * @returns {Object} Dictionary berisi teks yang diekstrak per tag
   */
  extractFromHTML(source, specificTags = null) {
    let container

    // Jika source adalah string HTML
    if (typeof source === 'string') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(source, 'text/html')
      container = doc.body || doc.documentElement
    } else {
      // Jika source adalah DOM element
      container = source
    }

    const tagsToExtract = specificTags || this.textTags
    const results = {}

    tagsToExtract.forEach((tag) => {
      const elements = container.querySelectorAll(tag)
      const texts = []

      elements.forEach((element) => {
        const text = element.textContent.trim()
        if (text) {
          const attributes = {}
          Array.from(element.attributes).forEach((attr) => {
            attributes[attr.name] = attr.value
          })

          texts.push({
            text: text,
            attributes: attributes,
            tagName: element.tagName.toLowerCase(),
            element: element, // Simpan referensi element untuk observer
          })
        }
      })

      if (texts.length > 0) {
        results[tag] = texts
      }
    })

    return results
  }

  /**
   * Setup Intersection Observer untuk memantau visibility element
   * @param {Object} options - Observer options
   * @param {Function} callback - Callback function ketika intersection berubah
   * @returns {string} Observer ID untuk referensi
   */
  createIntersectionObserver(options = {}, callback = null) {
    const defaultOptions = {
      root: null, // viewport
      rootMargin: '0px',
      threshold: 0.1, // 10% element visible
    }

    const observerOptions = { ...defaultOptions, ...options }
    const observerId = `observer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const text = entry.target.textContent.trim()
        const elementData = {
          element: entry.target,
          text: text,
          tagName: entry.target.tagName.toLowerCase(),
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
          boundingClientRect: entry.boundingClientRect,
          timestamp: Date.now(),
        }

        if (entry.isIntersecting) {
          this.visibleElements.add(entry.target)
        } else {
          this.visibleElements.delete(entry.target)
        }

        // Panggil callback jika ada
        if (callback) {
          callback(elementData)
        }

        // Panggil callback yang tersimpan
        const storedCallback = this.intersectionCallbacks.get(observerId)
        if (storedCallback) {
          storedCallback(elementData)
        }
      })
    }, observerOptions)

    this.observers.set(observerId, observer)
    if (callback) {
      this.intersectionCallbacks.set(observerId, callback)
    }

    return observerId
  }

  /**
   * Mulai memantau teks yang visible dengan Intersection Observer
   * @param {string[]} specificTags - Tag yang ingin dipantau
   * @param {Object} observerOptions - Options untuk Intersection Observer
   * @param {Function} onVisible - Callback ketika element menjadi visible
   * @param {Function} onHidden - Callback ketika element menjadi hidden
   * @returns {string} Observer ID
   */
  startVisibilityTracking(
    specificTags = null,
    observerOptions = {},
    onVisible = null,
    onHidden = null,
  ) {
    const observerId = this.createIntersectionObserver(observerOptions, (elementData) => {
      if (elementData.isIntersecting && onVisible) {
        onVisible(elementData)
      } else if (!elementData.isIntersecting && onHidden) {
        onHidden(elementData)
      }
    })

    // Observe semua element dengan tag yang ditentukan
    const tagsToTrack = specificTags || this.textTags
    tagsToTrack.forEach((tag) => {
      const elements = document.querySelectorAll(tag)
      elements.forEach((element) => {
        if (element.textContent.trim()) {
          this.observers.get(observerId).observe(element)
        }
      })
    })

    return observerId
  }

  /**
   * Ekstrak hanya teks yang sedang visible di viewport
   * @param {string[]} specificTags - Tag spesifik
   * @returns {Promise<Object>} Promise yang resolve ke teks yang visible
   */
  extractVisibleText(specificTags = null) {
    return new Promise((resolve) => {
      const visibleTexts = {}
      const tagsToExtract = specificTags || this.textTags

      // Buat temporary observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const tag = entry.target.tagName.toLowerCase()
              const text = entry.target.textContent.trim()

              if (text && tagsToExtract.includes(tag)) {
                if (!visibleTexts[tag]) {
                  visibleTexts[tag] = []
                }

                visibleTexts[tag].push({
                  text: text,
                  element: entry.target,
                  intersectionRatio: entry.intersectionRatio,
                  boundingClientRect: entry.boundingClientRect,
                })
              }
            }
          })

          // Disconnect observer setelah selesai
          setTimeout(() => {
            observer.disconnect()
            resolve(visibleTexts)
          }, 100)
        },
        { threshold: 0.1 },
      )

      // Observe semua element
      tagsToExtract.forEach((tag) => {
        const elements = document.querySelectorAll(tag)
        elements.forEach((element) => {
          if (element.textContent.trim()) {
            observer.observe(element)
          }
        })
      })
    })
  }

  /**
   * Setup lazy text extraction - ekstrak teks ketika element menjadi visible
   * @param {string[]} specificTags - Tag yang ingin dipantau
   * @param {Function} onTextExtracted - Callback ketika teks diekstrak
   * @param {Object} observerOptions - Options untuk observer
   * @returns {string} Observer ID
   */
  setupLazyTextExtraction(specificTags = null, onTextExtracted = null, observerOptions = {}) {
    const extractedElements = new Set()

    return this.startVisibilityTracking(specificTags, observerOptions, (elementData) => {
      // Hanya ekstrak sekali per element
      if (!extractedElements.has(elementData.element)) {
        extractedElements.add(elementData.element)

        const textData = {
          ...elementData,
          attributes: Object.fromEntries(
            Array.from(elementData.element.attributes).map((attr) => [attr.name, attr.value]),
          ),
          xpath: this.getXPath(elementData.element),
          parent: elementData.element.parentElement
            ? elementData.element.parentElement.tagName.toLowerCase()
            : null,
        }

        if (onTextExtracted) {
          onTextExtracted(textData)
        }
      }
    })
  }

  /**
   * Pantau perubahan teks dalam element yang visible
   * @param {string[]} specificTags - Tag yang dipantau
   * @param {Function} onTextChanged - Callback ketika teks berubah
   * @returns {Object} Object berisi observer ID dan mutation observer
   */
  trackTextChanges(specificTags = null, onTextChanged = null) {
    const observerId = this.startVisibilityTracking(specificTags)
    const textSnapshots = new Map()

    // Mutation Observer untuk detect perubahan teks
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const target =
            mutation.target.nodeType === Node.TEXT_NODE
              ? mutation.target.parentElement
              : mutation.target

          if (this.visibleElements.has(target)) {
            const newText = target.textContent.trim()
            const oldText = textSnapshots.get(target)

            if (newText !== oldText) {
              textSnapshots.set(target, newText)

              if (onTextChanged) {
                onTextChanged({
                  element: target,
                  oldText: oldText,
                  newText: newText,
                  timestamp: Date.now(),
                })
              }
            }
          }
        }
      })
    })

    // Observe perubahan pada body
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return {
      observerId: observerId,
      mutationObserver: mutationObserver,
      stop: () => {
        this.stopTracking(observerId)
        mutationObserver.disconnect()
      },
    }
  }

  /**
   * Hentikan tracking untuk observer tertentu
   * @param {string} observerId - ID observer yang ingin dihentikan
   */
  stopTracking(observerId) {
    const observer = this.observers.get(observerId)
    if (observer) {
      observer.disconnect()
      this.observers.delete(observerId)
      this.intersectionCallbacks.delete(observerId)
    }
  }

  /**
   * Hentikan semua tracking
   */
  stopAllTracking() {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
    this.intersectionCallbacks.clear()
    this.visibleElements.clear()
  }

  /**
   * Dapatkan semua teks yang sedang visible
   * @returns {Array} Array element yang visible beserta teksnya
   */
  getCurrentVisibleTexts() {
    return Array.from(this.visibleElements).map((element) => ({
      element: element,
      text: element.textContent.trim(),
      tagName: element.tagName.toLowerCase(),
      boundingClientRect: element.getBoundingClientRect(),
    }))
  }

  /**
   * Helper function untuk mendapatkan XPath
   */
  getXPath(element) {
    if (element === document.body) return '/html/body'

    let ix = 0
    const siblings = element.parentNode.childNodes

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i]
      if (sibling === element) {
        return (
          this.getXPath(element.parentNode) +
          '/' +
          element.tagName.toLowerCase() +
          '[' +
          (ix + 1) +
          ']'
        )
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++
      }
    }
  }

  // Methods dari versi sebelumnya yang masih diperlukan
  extractFromCurrentPage(specificTags = null) {
    if (typeof document === 'undefined') {
      throw new Error('Method ini hanya bisa dijalankan di browser')
    }
    return this.extractFromHTML(document.body, specificTags)
  }

  async extractFromURL(url, specificTags = null) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const html = await response.text()
      return this.extractFromHTML(html, specificTags)
    } catch (error) {
      return { error: `Gagal mengambil halaman: ${error.message}` }
    }
  }

  getAllTextSimple(source) {
    let container
    if (typeof source === 'string') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(source, 'text/html')
      container = doc.body || doc.documentElement
    } else {
      container = source
    }

    const scripts = container.querySelectorAll('script, style')
    scripts.forEach((el) => el.remove())
    return container.textContent.trim().replace(/\s+/g, ' ')
  }

  extractWithSelector(source, cssSelector) {
    let container
    if (typeof source === 'string') {
      const parser = new DOMParser()
      const doc = parser.parseFromString(source, 'text/html')
      container = doc.body || doc.documentElement
    } else {
      container = source
    }

    const elements = container.querySelectorAll(cssSelector)
    return Array.from(elements)
      .map((el) => el.textContent.trim())
      .filter((text) => text.length > 0)
  }
}

// Enhanced Utility Functions dengan Intersection Observer
const TextExtractorUtils = {
  // Start real-time visible text tracking
  startVisibleTextTracking: (callback, tags = ['div', 'p', 'span']) => {
    const extractor = new HTMLTextExtractor()
    return extractor.startVisibilityTracking(tags, {}, callback)
  },

  // Get currently visible texts
  getVisibleTexts: async (tags = ['div', 'p', 'span']) => {
    const extractor = new HTMLTextExtractor()
    return await extractor.extractVisibleText(tags)
  },

  // Track text changes in visible elements
  trackLiveTextChanges: (onChanged, tags = ['div', 'p', 'span']) => {
    const extractor = new HTMLTextExtractor()
    return extractor.trackTextChanges(tags, onChanged)
  },

  // Lazy load text extraction
  setupLazyLoading: (onLoaded, tags = ['div', 'p', 'span']) => {
    const extractor = new HTMLTextExtractor()
    return extractor.setupLazyTextExtraction(tags, onLoaded)
  },
}

// Demo functions
const demonstrateIntersectionObserver = () => {
  console.log('🚀 Demo Intersection Observer Text Extractor')

  const extractor = new HTMLTextExtractor()

  // Demo 1: Track visible text
  console.log('📍 Demo 1: Tracking visible text...')
  const trackingId = extractor.startVisibilityTracking(
    ['p', 'h1', 'h2', 'div'],
    { threshold: 0.5 }, // 50% visible
    (data) => console.log('✅ Element became visible:', data.text.substring(0, 50) + '...'),
    (data) => console.log('❌ Element became hidden:', data.text.substring(0, 50) + '...'),
  )

  // Demo 2: Get currently visible texts
  console.log('📍 Demo 2: Getting currently visible texts...')
  setTimeout(async () => {
    const visibleTexts = await extractor.extractVisibleText(['p', 'h1', 'h2'])
    console.log('👁️ Currently visible texts:', visibleTexts)
  }, 1000)

  // Demo 3: Lazy text extraction
  console.log('📍 Demo 3: Setting up lazy text extraction...')
  const lazyId = extractor.setupLazyTextExtraction(['div', 'p'], (data) =>
    console.log('🔄 Lazy loaded:', data.text.substring(0, 30) + '...'),
  )

  // Demo 4: Track text changes
  console.log('📍 Demo 4: Setting up text change tracking...')
  const changeTracker = extractor.trackTextChanges(['div', 'p'], (data) =>
    console.log('🔄 Text changed:', {
      old: data.oldText?.substring(0, 20),
      new: data.newText.substring(0, 20),
    }),
  )

  // Cleanup setelah 30 detik
  setTimeout(() => {
    console.log('🧹 Cleaning up demos...')
    extractor.stopTracking(trackingId)
    extractor.stopTracking(lazyId)
    changeTracker.stop()
  }, 30000)

  return { extractor, trackingId, lazyId, changeTracker }
}

// Auto-initialize di browser
if (typeof window !== 'undefined') {
  console.log('🎯 HTMLTextExtractor with Intersection Observer loaded!')
  console.log('💡 Try: demonstrateIntersectionObserver()')

  window.HTMLTextExtractor = HTMLTextExtractor
  window.TextExtractorUtils = TextExtractorUtils
  window.demonstrateIntersectionObserver = demonstrateIntersectionObserver

  // Auto demo jika DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🎬 DOM loaded - ready for intersection observer demos!')
    })
  }
}

// Export untuk Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HTMLTextExtractor, TextExtractorUtils }
}
