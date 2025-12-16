// // ============================================
// // CONTENT SCRIPT - INDEX.JS
// // ============================================

// // const { BullyingDetector } = require("./bullydetector")

// console.log('🎯 Bullying Detector Content Script Loaded')

// // Configuration - GANTI API URL DI SINI!
// const DETECTOR_CONFIG = {
//   API_URL: 'https://06f7982ed2ad.ngrok-free.app', // ← HAPUS /detect di sini
//   ENABLED: true,
//   BATCH_DELAY: 500,
//   TAGS_TO_MONITOR: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'li', 'article'],
//   DEBUG: true,
// }

// // Global detector instance
// let detector = null

// /**
//  * Initialize bullying detector
//  */
// function initDetector() {
//   if (!DETECTOR_CONFIG.ENABLED) {
//     console.log('ℹ️  Bullying Detector is disabled')
//     return
//   }

//   if (!DETECTOR_CONFIG.API_URL || DETECTOR_CONFIG.API_URL.includes('your-ngrok-url')) {
//     console.error('❌ Please configure API_URL in DETECTOR_CONFIG!')
//     return
//   }

//   try {
//     // Check if BullyingDetector is available
//     if (typeof BullyingDetector === 'undefined') {
//       console.error('❌ BullyingDetector class not found! Make sure bullydetector.js is loaded first.')
//       return
//     }

//     // Create detector instance
//     detector = new BullyingDetector(DETECTOR_CONFIG.API_URL)
//     detector.batchDelay = DETECTOR_CONFIG.BATCH_DELAY
//     detector.debugMode = DETECTOR_CONFIG.DEBUG

//     // Start detection
//     detector.start(DETECTOR_CONFIG.TAGS_TO_MONITOR)

//     console.log('✅ Bullying Detector initialized successfully')
//     console.log(`📡 API: ${DETECTOR_CONFIG.API_URL}`)
//     console.log(`🏷️  Monitoring: ${DETECTOR_CONFIG.TAGS_TO_MONITOR.join(', ')}`)
//   } catch (error) {
//     console.error('❌ Failed to initialize detector:', error)
//   }
// }

// /**
//  * Stop detector
//  */
// function stopDetector() {
//   if (detector) {
//     detector.stop()
//     console.log('🛑 Detector stopped')
//   }
// }

// /**
//  * Reset detector
//  */
// function resetDetector() {
//   if (detector) {
//     detector.reset()
//     console.log('🔄 Detector reset')
//   }
// }

// /**
//  * Get statistics
//  */
// function getDetectorStats() {
//   if (detector) {
//     const stats = detector.getStats()
//     console.log('📊 Statistics:', stats)
//     return stats
//   }
//   return null
// }

// // ============================================
// // AUTO-INITIALIZATION
// // ============================================

// // Wait for DOM to be fully loaded
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => {
//     console.log('📄 DOM loaded, initializing detector...')
//     setTimeout(initDetector, 500) // Delay sedikit untuk ensure bullydetector.js loaded
//   })
// } else {
//   // DOM already loaded
//   console.log('📄 DOM ready, initializing detector...')
//   setTimeout(initDetector, 500)
// }

// // Handle dynamic content (optional - untuk SPA)
// const observeNewContent = () => {
//   const mutationObserver = new MutationObserver((mutations) => {
//     // Re-observe new elements yang ditambahkan secara dinamis
//     if (detector && detector.observer) {
//       mutations.forEach((mutation) => {
//         mutation.addedNodes.forEach((node) => {
//           if (node.nodeType === Node.ELEMENT_NODE) {
//             DETECTOR_CONFIG.TAGS_TO_MONITOR.forEach((tag) => {
//               if (node.tagName && node.tagName.toLowerCase() === tag) {
//                 const text = node.textContent.trim()
//                 if (text && text.length > 3 && !detector.processedElements.has(node)) {
//                   detector.observer.observe(node)
//                 }
//               }
//               // Check children
//               const children = node.querySelectorAll(tag)
//               children.forEach((child) => {
//                 const text = child.textContent.trim()
//                 if (text && text.length > 3 && !detector.processedElements.has(child)) {
//                   detector.observer.observe(child)
//                 }
//               })
//             })
//           }
//         })
//       })
//     }
//   })

//   mutationObserver.observe(document.body, {
//     childList: true,
//     subtree: true,
//   })

//   console.log('👀 Dynamic content observer active')
// }

// // Enable dynamic content observation after initial load
// setTimeout(() => {
//   if (detector) {
//     observeNewContent()
//   }
// }, 3000)

// // ============================================
// // MESSAGE LISTENER (Optional - untuk popup control)
// // ============================================

// if (typeof chrome !== 'undefined' && chrome.runtime) {
//   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     switch (request.action) {
//       case 'getStats':
//         sendResponse(getDetectorStats())
//         break

//       case 'stop':
//         stopDetector()
//         sendResponse({ success: true })
//         break

//       case 'start':
//         if (!detector) {
//           initDetector()
//         } else {
//           detector.start(DETECTOR_CONFIG.TAGS_TO_MONITOR)
//         }
//         sendResponse({ success: true })
//         break

//       case 'reset':
//         resetDetector()
//         sendResponse({ success: true })
//         break

//       default:
//         sendResponse({ error: 'Unknown action' })
//     }

//     return true // Keep message channel open for async response
//   })
// }

// // ============================================
// // EXPOSE TO WINDOW (untuk debugging di console)
// // ============================================

// window.bullyingDetector = {
//   instance: () => detector,
//   stats: getDetectorStats,
//   stop: stopDetector,
//   reset: resetDetector,
//   config: DETECTOR_CONFIG,
// }

// console.log('💡 Debugging: Access via window.bullyingDetector')



console.log('🔥 index.js LOADED!')

console.log('🔥 Checking if BullyingDetector exists:', typeof BullyingDetector)
console.log('🔥 Checking window.BullyingDetector:', typeof window.BullyingDetector)

// Test langsung
setTimeout(() => {
  console.log('🔥 Delayed check - BullyingDetector:', typeof BullyingDetector)
  console.log('🔥 Delayed check - window.BullyingDetector:', typeof window.BullyingDetector)
  
  if (typeof BullyingDetector !== 'undefined') {
    console.log('✅ BullyingDetector found! Initializing...')
    const detector = new BullyingDetector('https://06f7982ed2ad.ngrok-free.app')
    console.log('✅ Detector created:', detector)
  } else {
    console.error('❌ BullyingDetector NOT FOUND!')
  }
}, 1000)