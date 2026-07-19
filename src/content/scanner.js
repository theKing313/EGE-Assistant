/**
 * scanner.js
 * Detects EGE/OGE task elements on supported educational sites.
 * Returns an array of { element, taskNumber, taskText, subject } objects.
 */

// Site-specific selectors ordered by specificity
const SITE_PROFILES = [
  {
    // reshu.ru / sdamgia.ru
    hostname: ['reshu.ru', 'sdamgia.ru'],
    taskContainer: '.prob_maindiv',
    taskText: '.pbody',
    taskNumber: '.problem_num a, .num_link',
  },
  {
    // Generic fallback
    hostname: [],
    taskContainer: '.task, .problem, .exercise, [class*="task"], [class*="prob"]',
    taskText: null,
    taskNumber: null,
  },
]

function getProfile(hostname) {
  for (const profile of SITE_PROFILES) {
    if (profile.hostname.some((h) => hostname.includes(h))) {
      return profile
    }
  }
  return SITE_PROFILES[SITE_PROFILES.length - 1]
}

function detectSubject() {
  const url = window.location.href.toLowerCase()
  const title = document.title.toLowerCase()

  if (url.includes('math') || url.includes('матем') || title.includes('матем')) return 'math'
  if (url.includes('rus') || url.includes('русс') || title.includes('русск')) return 'russian'
  if (url.includes('phys') || url.includes('физ') || title.includes('физ')) return 'physics'
  if (url.includes('chem') || url.includes('хим') || title.includes('хим')) return 'chemistry'
  if (url.includes('bio') || url.includes('биол') || title.includes('биол')) return 'biology'
  if (url.includes('hist') || url.includes('истор') || title.includes('истор')) return 'history'

  // Try reading subject from page breadcrumbs / headings
  const breadcrumb = document.querySelector('.breadcrumb, .crumbs, h1, h2')
  if (breadcrumb) {
    const text = breadcrumb.textContent.toLowerCase()
    if (text.includes('матем')) return 'math'
    if (text.includes('русск') || text.includes('русский')) return 'russian'
  }

  return 'russian' // default
}

export function scanForTasks() {
  const hostname = window.location.hostname
  const profile = getProfile(hostname)
  const subject = detectSubject()

  const containers = document.querySelectorAll(profile.taskContainer)
  const tasks = []

  containers.forEach((el, index) => {
    // Skip if already has a lamp button
    if (el.querySelector('.smartege-lamp-wrapper')) return

    // Extract task number
    let taskNumber = null
    if (profile.taskNumber) {
      const numEl = el.querySelector(profile.taskNumber)
      if (numEl) {
        const match = numEl.textContent.match(/\d+/)
        taskNumber = match ? parseInt(match[0]) : null
      }
    }
    if (taskNumber === null) taskNumber = index + 1

    // Extract task text
    let taskText = ''
    if (profile.taskText) {
      const textEl = el.querySelector(profile.taskText)
      taskText = textEl ? textEl.textContent.trim() : el.textContent.trim()
    } else {
      taskText = el.textContent.trim()
    }

    tasks.push({
      element: el,
      taskNumber,
      taskText: taskText.slice(0, 300), // limit for matching
      subject,
      index,
    })
  })

  return tasks
}

/**
 * Watches for dynamic content and calls callback when new tasks appear.
 */
export function watchForTasks(callback) {
  let debounceTimer = null

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      const tasks = scanForTasks()
      if (tasks.length > 0) callback(tasks)
    }, 500)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  return observer
}
