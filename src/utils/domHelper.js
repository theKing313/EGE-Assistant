/**
 * domHelper.js
 * Helpers for injecting SmartEGE elements into the page DOM.
 */

const CONTAINER_CLASS = 'smartege-lamp-wrapper'
const STYLE_ID = 'smartege-injected-styles'

/**
 * Inject CSS string into the page <head> exactly once.
 */
export function injectStyles(cssString) {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = cssString
  document.head.appendChild(style)
}

/**
 * Create and attach a mount point for the Lamp component inside a task element.
 * Returns the mount div, or null if the task already has a lamp.
 */
export function createLampMount(taskElement) {
  if (taskElement.querySelector(`.${CONTAINER_CLASS}`)) return null

  const wrapper = document.createElement('div')
  wrapper.className = CONTAINER_CLASS

  // Try to insert after the task number / before the task body
  const firstChild = taskElement.firstElementChild
  if (firstChild) {
    taskElement.insertBefore(wrapper, firstChild.nextSibling || firstChild)
  } else {
    taskElement.appendChild(wrapper)
  }

  return wrapper
}

/**
 * Remove all SmartEGE lamp wrappers (e.g. before re-scanning).
 */
export function clearAllLamps() {
  document.querySelectorAll(`.${CONTAINER_CLASS}`).forEach((el) => el.remove())
}

/**
 * Check if an element is visible in the viewport.
 */
export function isVisible(element) {
  const rect = element.getBoundingClientRect()
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < window.innerHeight &&
    rect.bottom > 0
  )
}
