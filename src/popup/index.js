import './index.css'

let isOn = true
let activeMode = 'blur'

const platformName = document.querySelector('.platform-name')
const platformUrl = document.querySelector('.platform-url')

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch')

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0]
    const title = activeTab.title
    const url = activeTab.url

    platformName.innerText = title
    platformUrl.innerText = url
  })

  //   const title = document.querySelector('title')
  //   platformName.textContent = title?.textContent || ''

  // Event: Toggle ON/OFF
  toggleSwitch.addEventListener('click', toggleStatus)

  // Event: Mode selector
  const modeOptions = document.querySelectorAll('.mode-option')
  modeOptions.forEach((option) => {
    option.addEventListener('click', () => {
      const mode = option.getAttribute('data-mode')
      toggleMode(mode)
    })
  })
})

function toggleStatus() {
  isOn = !isOn
  const toggle = document.getElementById('toggleSwitch')
  const statusText = document.getElementById('statusText')

  if (isOn) {
    toggle.classList.remove('off')
    statusText.textContent = 'ON'
  } else {
    toggle.classList.add('off')
    statusText.textContent = 'OFF'
  }
}

function toggleMode(mode) {
  activeMode = mode

  document.getElementById('blurCheck').classList.remove('checked')
  document.getElementById('warningCheck').classList.remove('checked')
  document.getElementById('hideCheck').classList.remove('checked')

  document.getElementById(mode + 'Check').classList.add('checked')
}
