/**
 * scanner.js
 * Detects EGE/OGE task elements on supported educational sites.
 *
 * Returns:
 * {
 *   element,
 *   taskNumber,
 *   taskId,
 *   taskText,
 *   subject,
 *   index
 * }
 */

// ---------------------------------------------------------
// Site-specific selectors
// ---------------------------------------------------------

const SITE_PROFILES = [
  {
    // reshu.ru / sdamgia.ru
    hostname: ["reshu.ru", "sdamgia.ru"],

    // Main task container
    taskContainer: ".prob_maindiv",

    // IMPORTANT:
    // The real task body is NOT the first ".pbody".
    // There is another hidden ".pbody" containing theory.
    taskText: 'div[id^="body"].pbody',

    // Real task number container on sdamgia.ru
    taskNumber: ".prob_nums",

    // Exercise ID is stored in the <a>
    taskId: ".prob_nums a",
  },

  {
    // Generic fallback
    hostname: [],

    taskContainer:
      '.task, .problem, .exercise, [class*="task"], [class*="prob"]',

    taskText: null,
    taskNumber: null,
    taskId: null,
  },
];

// ---------------------------------------------------------
// Profile
// ---------------------------------------------------------

function getProfile(hostname) {
  for (const profile of SITE_PROFILES) {
    if (profile.hostname.some((h) => hostname.includes(h))) {
      return profile;
    }
  }

  return SITE_PROFILES[SITE_PROFILES.length - 1];
}

// ---------------------------------------------------------
// Subject detection
// ---------------------------------------------------------

function detectSubject() {
  const url = window.location.href.toLowerCase();
  const title = document.title.toLowerCase();

  console.log("[SmartEGE] Detecting subject:", { url, title });

  if (
    url.includes("math") ||
    url.includes("матем") ||
    title.includes("матем")
  ) {
    return "math";
  }

  if (url.includes("rus") || url.includes("русс") || title.includes("русск")) {
    return "russian";
  }

  if (url.includes("phys") || url.includes("физ") || title.includes("физ")) {
    return "physics";
  }

  if (url.includes("chem") || url.includes("хим") || title.includes("хим")) {
    return "chemistry";
  }

  if (url.includes("bio") || url.includes("биол") || title.includes("биол")) {
    return "biology";
  }

  if (
    url.includes("hist") ||
    url.includes("истор") ||
    title.includes("истор")
  ) {
    return "history";
  }

  // Try page breadcrumbs / headings
  const breadcrumb = document.querySelector(".breadcrumb, .crumbs, h1, h2");

  if (breadcrumb) {
    const text = breadcrumb.textContent.toLowerCase();

    if (text.includes("матем")) {
      return "math";
    }

    if (text.includes("русск") || text.includes("русский")) {
      return "russian";
    }
  }

  return "russian";
}

// ---------------------------------------------------------
// Extract task number
// ---------------------------------------------------------

function extractTaskNumber(el, profile) {
  if (!profile.taskNumber) {
    return null;
  }

  const numEl = el.querySelector(profile.taskNumber);

  if (!numEl) {
    return null;
  }

  const text = numEl.textContent || "";

  /*
   * Example:
   *
   * "Тип 9 № 46517"
   *
   * We want 9, NOT 46517.
   */

  const typeMatch = text.match(/тип\s*(\d+)/i);

  if (typeMatch) {
    return Number(typeMatch[1]);
  }

  return null;
}

// ---------------------------------------------------------
// Extract exercise ID
// ---------------------------------------------------------

function extractTaskId(el, profile) {
  if (!profile.taskId) {
    return null;
  }

  const idEl = el.querySelector(profile.taskId);

  if (!idEl) {
    return null;
  }

  // href example:
  // /problem?id=46517

  const href = idEl.getAttribute("href") || "";

  const match = href.match(/[?&]id=(\d+)/i);

  if (match) {
    return Number(match[1]);
  }

  const text = idEl.textContent || "";

  const numberMatch = text.match(/\d+/);

  return numberMatch ? Number(numberMatch[0]) : null;
}

// ---------------------------------------------------------
// Extract actual task text
// ---------------------------------------------------------

function extractTaskText(el, profile) {
  let textEl = null;

  if (profile.taskText) {
    textEl = el.querySelector(profile.taskText);
  }

  /*
   * sdamgia.ru:
   *
   * The container contains:
   *
   * 1. Hidden theory .pbody
   * 2. Actual task #bodyXXXX.pbody
   *
   * Never use the first generic ".pbody".
   */

  if (!textEl) {
    // Explicit fallback for sdamgia
    textEl = el.querySelector('div[id^="body"].pbody');
  }

  if (!textEl) {
    // Generic fallback
    textEl = el;
  }

  const text = (textEl.innerText || textEl.textContent || "")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

// ---------------------------------------------------------
// Scan tasks
// ---------------------------------------------------------

export function scanForTasks() {
  const hostname = window.location.hostname;

  const profile = getProfile(hostname);

  const subject = detectSubject();

  const containers = document.querySelectorAll(profile.taskContainer);

  const tasks = [];

  containers.forEach((el, index) => {
    // Skip if lamp already exists
    if (el.querySelector(".smartege-lamp-wrapper")) {
      return;
    }

    const taskNumber = extractTaskNumber(el, profile);

    const taskId = extractTaskId(el, profile);

    const taskText = extractTaskText(el, profile);

    /*
     * IMPORTANT:
     * Do NOT use index + 1 as task number.
     *
     * The task number is meaningful
     * and should come from the DOM.
     */

    tasks.push({
      element: el,

      taskNumber,

      taskId,

      taskText,

      subject,

      index,
    });

    console.debug("[SmartEGE] Extracted task:", {
      taskNumber,
      taskId,
      subject,
      taskText,
    });
  });

  return tasks;
}

// ---------------------------------------------------------
// Watch dynamic content
// ---------------------------------------------------------

export function watchForTasks(callback) {
  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const tasks = scanForTasks();

      if (tasks.length > 0) {
        callback(tasks);
      }
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}
