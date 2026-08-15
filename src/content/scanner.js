/**
 * scanner.js
 * Detects EGE/OGE task elements on supported educational sites.
 * Returns an array of { element, taskNumber, taskText, subject } objects.
 */

// Site-specific selectors ordered by specificity
const SITE_PROFILES = [
  {
    // reshu.ru / sdamgia.ru
    hostname: ["reshu.ru", "sdamgia.ru"],
    taskContainer: ".prob_maindiv",
    taskText: ".probtext .pbody, .probtext, .pbody, .pbody > span",
    taskNumber: ".problem_num a, .num_link",
  },
  {
    // Generic fallback
    hostname: [],
    taskContainer:
      '.task, .problem, .exercise, [class*="task"], [class*="prob"]',
    taskText: null,
    taskNumber: null,
  },
];

function getProfile(hostname) {
  for (const profile of SITE_PROFILES) {
    if (profile.hostname.some((h) => hostname.includes(h))) {
      return profile;
    }
  }
  return SITE_PROFILES[SITE_PROFILES.length - 1];
}

function detectSubject() {
  const hostname = window.location.hostname.toLowerCase();
  const url = window.location.href.toLowerCase();
  const title = (document.title || "").toLowerCase();

  const stylesheetSources = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]'),
  )
    .map((link) => (link.href || link.getAttribute("href") || "").toLowerCase())
    .join(" ");

  const headings = Array.from(
    document.querySelectorAll("h1, h2, .breadcrumb, .crumbs, .title"),
  )
    .map((el) => el.textContent || "")
    .join(" ")
    .toLowerCase();

  const sources = [hostname, url, title, headings, stylesheetSources];
  console.log("[SmartEGE] Subject detection sources:", sources);
  const subjectChecks = [
    {
      subject: "math",
      patterns: [
        "math",
        "матем",
        "алгебра",
        "геометрия",
        "математика",
        "style_math",
        "math.css",
      ],
    },
    {
      subject: "russian",
      patterns: [
        "rus",
        "рус",
        "russian",
        "русский",
        "язык",
        "орфография",
        "сочинение",
        "style_rus",
        "style_ru",
        "rus.css",
      ],
    },
    { subject: "physics", patterns: ["phys", "физ", "физика"] },
    { subject: "chemistry", patterns: ["chem", "хим", "химия"] },
    { subject: "biology", patterns: ["bio", "биол", "биология"] },
    { subject: "history", patterns: ["hist", "истор", "история"] },
  ];

  for (const { subject, patterns } of subjectChecks) {
    if (
      patterns.some((pattern) =>
        sources.some((source) => source.includes(pattern)),
      )
    ) {
      return subject;
    }
  }

  return "russian";
}

function normalizeText(value) {
  return (value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r?\n+/g, "\n")
    .trim();
}

export function scanForTasks() {
  const hostname = window.location.hostname;
  const profile = getProfile(hostname);
  const subject = detectSubject();
  console.debug(
    `[SmartEGE] Scanning for tasks on ${hostname} (subject: ${subject})`,
  );
  const containers = document.querySelectorAll(profile.taskContainer);
  const tasks = [];

  containers.forEach((el, index) => {
    // Skip if already has a lamp button
    if (el.querySelector(".smartege-lamp-wrapper")) return;

    // console.debug("[SmartEGE] Found task container--=====--:", {
    //   subject,
    //   profile,
    //   index,
    //   container: el.className || el.tagName,
    // });
    // Extract task number
    let taskNumber = null;
    if (profile.taskNumber) {
      const numEl = el.querySelector(profile.taskNumber);
      if (numEl) {
        const match = numEl.textContent.match(/\d+/);
        taskNumber = match ? parseInt(match[0]) : null;
      }
    }
    // Extract task text
    let taskText = "";
    let extraTexts = [];
    if (profile.taskText) {
      const selectors = profile.taskText.split(",").map((s) => s.trim());
      const textCandidates = selectors
        .map((selector) => el.querySelector(selector))
        .filter(
          (candidate) =>
            candidate && normalizeText(candidate.textContent).length > 0,
        );

      const mainText = textCandidates[0]
        ? normalizeText(textCandidates[0].textContent)
        : "";
      extraTexts = Array.from(el.querySelectorAll(".left_margin"))
        .map((node) => normalizeText(node.textContent))
        .filter(Boolean);

      // console.debug("[SmartEGE] taskText extracted from site:", {
      //   subject,
      //   taskNumber,
      //   mainText,
      //   extraTexts,
      //   container: el.className || el.tagName,
      // });
      taskText = [mainText, ...extraTexts].filter(Boolean).join("\n");
    } else {
      taskText = normalizeText(el.textContent);
    }

    // console.debug("[SmartEGE] taskText extracted from site:", {
    //   subject,
    //   taskNumber,
    //   taskText,
    //   container: el.className || el.tagName,
    // });

    tasks.push({
      element: el,
      taskNumber,
      taskText: taskText.slice(0, 300), // limit for matching,
      extraTexts,
      subject,
      index,
    });
  });

  return tasks;
}

/**
 * Watches for dynamic content and calls callback when new tasks appear.
 */
export function watchForTasks(callback) {
  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const tasks = scanForTasks();
      if (tasks.length > 0) callback(tasks);
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}
