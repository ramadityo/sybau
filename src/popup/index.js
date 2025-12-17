import Chart from "chart.js/auto";
import './index.css'

let isOn = true
let activeMode = 'blur'

const platformName = document.querySelector('.platform-name')
const platformUrl = document.querySelector('.platform-url')
const bullyCount = document.querySelector('.bully-text-count')
const normalCount = document.querySelector('.normal-text-count')

async function loadTrendChart() {
  try {
    const response = await fetch(`https://846afcb07424.ngrok-free.app/trends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // body: JSON.stringify(requestBody),
    })
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  
    const data = await response.json()
    // const trendsDatas = data.data;

    console.log(data);

    // Mapping data dari API
    const labels = data.trends.map((item) => item.date)
    const bullyingData = data.trends.map((item) => Number(item.bullying_count))
    const normalData = data.trends.map((item) => Number(item.non_bullying_count))

    // // Update counter di UI
    // document.querySelector('.bully-text-count').textContent = bullyingData.reduce(
    //   (a, b) => a + b,
    //   0,
    // )

    // document.querySelector('.normal-text-count').textContent = normalData.reduce((a, b) => a + b, 0)

    const ctx = document.getElementById('trendChart').getContext('2d')

    new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cyberbullying',
            data: bullyingData,
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderRadius: 6,
          },
          {
            label: 'Normal',
            data: normalData,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Trend Analisis Komentar',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 5,
            },
          },
        },
      },
    })
  } catch (error) {
    console.error('Gagal load chart:', error)
  }
}

async function getTrends() {
  // const response = await fetch('https://f8e1166744e1.ngrok-free.app/trends/today')
  const response = await fetch(`https://846afcb07424.ngrok-free.app/trends/today`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()

  bullyCount.innerText = data.data.bullying_count
  normalCount.innerText = data.data.non_bullying_count
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch')

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0]
    const title = activeTab.title
    const url = activeTab.url

    platformName.innerText = title
    platformUrl.innerText = url
  })

  getTrends();
  loadTrendChart();

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
