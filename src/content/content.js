/**
 * content.js — SmartEGE Content Script Entry Point
 *
 * Injected into supported educational pages (reshu.ru, sdamgia.ru, etc.)
 * Scans for EGE task elements, mounts 💡 Lamp React buttons next to each.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { scanForTasks, watchForTasks } from "./scanner.js";
import { injectStyles, createLampMount } from "../utils/domHelper.js";
import Lamp from "../components/Lamp/Lamp.jsx";

// All content-script CSS imported inline (Vite ?inline) and injected once
import lampCss from "../components/Lamp/Lamp.css?inline";
import tooltipCss from "../components/Tooltip/Tooltip.css?inline";
import hintContentCss from "../components/HintContent/HintContent.css?inline";
import authModalCss from "../components/AuthModal/AuthModal.css?inline";

injectStyles([lampCss, tooltipCss, hintContentCss, authModalCss].join("\n"));

// Track mounted React roots — never double-mount the same task element
const mountedRoots = new WeakMap();

function mountLamp(task) {
  const { element, taskText, taskNumber, subject, extraTexts = [] } = task;
  if (mountedRoots.has(element)) return;

  const mount = createLampMount(element);
  if (!mount) return;

  const root = ReactDOM.createRoot(mount);
  root.render(
    React.createElement(Lamp, { taskText, taskNumber, subject, extraTexts }),
  );
  mountedRoots.set(element, root);
}

function processPage() {
  const tasks = scanForTasks();
  if (tasks.length === 0) return;
  tasks.forEach(mountLamp);
  console.debug(`[SmartEGE] Mounted ${tasks.length} lamp(s)`);
}

// Initial run
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", processPage);
} else {
  processPage();
}

// Watch for dynamically loaded tasks (SPA navigation, lazy content)
watchForTasks((newTasks) => newTasks.forEach(mountLamp));
