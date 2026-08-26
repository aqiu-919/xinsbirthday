const state = {
  events: [],
  archiveEvents: [],
  currentFilter: "全部",
  visited: new Set(JSON.parse(localStorage.getItem("wangli-visited") || "[]")),
  audio: null,
  audioPlayed: false,
  walking: false,
  walkFrame: 0,
  lastWalkTime: 0,
  resumeAfterDialog: false,
  reachedSpecials: new Set(),
  draggingProgress: false,
  endSequenceStarted: false,
  endSceneTimers: [],
  beginJourneyTimer: 0,
  journeyTransitionTimers: [],
  transitioningJourney: false,
  progressFrame: 0,
  timelineMetrics: null,
  lastProgressIndex: -1,
  lastProgressRatio: -1,
  dialogOpenTimer: 0,
  dialogAutoCloseTimer: 0,
};

const el = (id) => document.getElementById(id);
const journey = el("journey");
const track = el("track");
const traveler = el("traveler");
const postTimeline = el("postTimeline");
const accounts = el("accounts");
const archive = el("archive");
const categories = ["全部", "影视", "音乐", "舞台", "综艺", "杂志", "其他"];
const WALK_SPEED = 58;

function isDesktopLayout() {
  return window.innerWidth > 760;
}

function getJourneyPosition() {
  return isDesktopLayout() ? window.scrollX : window.scrollY;
}

function scrollJourneyTo(position, behavior = "auto") {
  if (isDesktopLayout()) {
    window.scrollTo({ left: position, behavior });
    return;
  }
  window.scrollTo({ top: position, behavior });
}

function classify(event) {
  const category = String(event["类别"] || "其他");
  return categories.includes(category) && category !== "全部" ? category : "其他";
}

async function init() {
  const [timelineResponse, archiveResponse] = await Promise.all([
    fetch("data/timeline.json"),
    fetch("data/archive.json"),
  ]);
  state.events = await timelineResponse.json();
  state.archiveEvents = await archiveResponse.json();
  renderTimeline();
  renderFilters();
  renderArchive();
  renderYears();
  bindEvents();
  initStars();
  localStorage.removeItem("wangli-journey-progress");
  updateProgress();
}

function renderTimeline() {
  const pianoKeys = Array.from({ length: 142 }, (_, index) => {
    const ratio = index / 141;
    const x = Math.sin(ratio * Math.PI * 4.2) * 24 + Math.sin(ratio * Math.PI * 1.6) * 8;
    const nextRatio = Math.min(1, (index + 1) / 141);
    const nextX = Math.sin(nextRatio * Math.PI * 4.2) * 24 + Math.sin(nextRatio * Math.PI * 1.6) * 8;
    const angle = Math.atan2(nextX - x, 72) * -180 / Math.PI;
    const hasBlack = [1, 3, 6, 8, 10].includes(index % 12);
    return `<i class="piano-key${hasBlack ? " has-black" : ""}" style="--key-y:${ratio * 100}%;--key-x:${x}px;--key-angle:${angle}deg"></i>`;
  }).join("");
  track.insertAdjacentHTML("afterbegin", `<div class="piano-path">${pianoKeys}</div>`);
  state.events.forEach((event, index) => {
    const ratio = index / (state.events.length - 1);
    const node = document.createElement("article");
    node.className = `event-node${state.visited.has(event["活动ID"]) ? " visited" : ""}`;
    node.dataset.id = event["活动ID"];
    node.dataset.index = index;
    const trackPadding = window.innerWidth <= 760 ? window.innerHeight * .52 + 40 : 280;
    node.style.setProperty("--timeline-y", `${ratio * (el("timeline").offsetHeight - trackPadding)}px`);
    node.style.setProperty("--timeline-x", `${ratio * 100}%`);
    const pathX = Math.sin(ratio * Math.PI * 4.2) * 24 + Math.sin(ratio * Math.PI * 1.6) * 8;
    node.style.setProperty("--path-x", `${pathX}px`);
    if (isSpecialEvent(event)) node.classList.add("special-node");
    const nodeTitle = String(event["活动/事件名称"] || "").replace(/\s+/g, " ").trim();
    const titleSizeClass = nodeTitle.length > 24 ? " is-very-long" : nodeTitle.length > 16 ? " is-long" : "";
    node.innerHTML = `
      <button class="node-button" aria-label="查看${escapeHtml(event["活动/事件名称"])}"></button>
      <div class="node-copy">
        <time class="node-date" datetime="${escapeHtml(event["日期精度"])}">${escapeHtml(event["日期精度"])}</time>
        <strong class="node-title${titleSizeClass}">${escapeHtml(nodeTitle)}</strong>
        ${event["文字介绍"] ? `<p class="node-intro">${escapeHtml(event["文字介绍"])}</p>` : ""}
      </div>`;
    node.querySelector("button").addEventListener("click", () => openEvent(event, node));
    track.appendChild(node);
  });
}

function openEvent(event, node, { auto = false } = {}) {
  clearTimeout(state.dialogOpenTimer);
  clearTimeout(state.dialogAutoCloseTimer);
  state.resumeAfterDialog = auto || state.walking;
  stopWalking();
  state.visited.add(event["活动ID"]);
  localStorage.setItem("wangli-visited", JSON.stringify([...state.visited]));
  node.classList.add("visited");
  el("dialogDate").textContent = event["日期精度"];
  el("dialogDate").dateTime = event["日期精度"];
  el("dialogTitle").textContent = event["活动/事件名称"];
  el("dialogIntro").textContent = event["文字介绍"] || "";
  el("dialogIntro").hidden = !event["文字介绍"];
  const media = el("dialogMedia");
  const image = el("dialogImage");
  if (event["素材展示"]) {
    image.src = event["素材展示"];
    image.alt = `${String(event["活动/事件名称"]).replace(/\s+/g, " ")}相关图片`;
    media.hidden = false;
  } else {
    image.removeAttribute("src");
    image.alt = "";
    media.hidden = true;
  }
  const sourceUrls = String(event["来源URL"] || "").split(/\s+/).filter(Boolean);
  el("dialogSources").innerHTML = sourceUrls.map((url, index) =>
    `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${sourceUrls.length > 1 ? `资料来源 ${index + 1}` : "查看资料来源"} ↗</a>`
  ).join("");
  el("dialogSources").hidden = sourceUrls.length === 0;
  el("eventDialog").classList.toggle("special-event-dialog", isSpecialEvent(event));
  el("flash").classList.remove("active");
  void el("flash").offsetWidth;
  el("flash").classList.add("active");
  state.dialogOpenTimer = setTimeout(() => {
    if (!el("eventDialog").open) el("eventDialog").showModal();
    if (auto) {
      state.dialogAutoCloseTimer = setTimeout(() => {
        if (el("imageDialog").open) el("imageDialog").close();
        if (el("eventDialog").open) el("eventDialog").close();
      }, 7000);
    }
  }, 260);
  playChime();
}

function renderFilters() {
  el("filters").innerHTML = categories.map((category) => `<button class="filter-btn${category === "全部" ? " active" : ""}" data-filter="${category}" role="tab">${category}</button>`).join("");
}

function renderArchive() {
  const query = el("searchInput").value.trim().toLowerCase();
  const visible = state.archiveEvents.filter((event) => {
    const category = classify(event);
    const matchesFilter = state.currentFilter === "全部" || category === state.currentFilter;
    const matchesQuery = !query || Object.values(event).join(" ").toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  el("archiveGrid").innerHTML = state.currentFilter === "全部"
    ? renderArchiveByYear(visible)
    : [...visible]
      .sort((a, b) => Number(b["年份"]) - Number(a["年份"]) || compareArchiveEvents(a, b))
      .map(renderArchiveEvent)
      .join("");
  el("emptyState").hidden = visible.length > 0;
}

function renderArchiveByYear(events) {
  const years = new Map();
  events.forEach((event) => {
    const year = String(event["年份"]);
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(event);
  });
  return [...years.entries()]
    .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
    .map(([year, yearEvents]) => {
      const sortedEvents = [...yearEvents].sort(compareArchiveEvents);
      return `<section class="archive-year-section" data-year="${year}">
        <header class="archive-year-heading">
          <button class="archive-year-button" type="button" aria-expanded="false" aria-controls="archive-year-${year}">${year}</button>
          <span>${yearEvents.length} 条记录</span>
        </header>
        <div id="archive-year-${year}" class="archive-year-groups" hidden>${sortedEvents.map(renderArchiveEvent).join("")}</div>
      </section>`;
    }).join("");
}

function archiveDateParts(event) {
  const value = String(event["日期精度"] || event["年份"] || "");
  const match = value.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!match) return { year: Number(event["年份"]) || 0, month: 99, day: 99, precision: 0 };
  return {
    year: Number(match[1]),
    month: match[2] ? Number(match[2]) : 99,
    day: match[3] ? Number(match[3]) : 99,
    precision: match[3] ? 3 : match[2] ? 2 : 1,
  };
}

function compareArchiveEvents(a, b) {
  const dateA = archiveDateParts(a);
  const dateB = archiveDateParts(b);
  return dateA.month - dateB.month
    || dateA.day - dateB.day
    || String(a["类别"]).localeCompare(String(b["类别"]), "zh-CN")
    || String(a["活动/事件名称"]).localeCompare(String(b["活动/事件名称"]), "zh-CN");
}

function formatArchiveDate(event) {
  const date = archiveDateParts(event);
  if (date.precision === 3) return `${date.year}年${date.month}月${date.day}日`;
  if (date.precision === 2) return `${date.year}年${date.month}月`;
  if (date.precision === 1) return `${date.year}年（具体日期待核）`;
  return escapeHtml(event["日期精度"] || event["年份"] || "日期待核");
}

function renderArchiveEvent(event) {
  const title = escapeHtml(event["活动/事件名称"]);
  return `<article class="archive-row">
    <time class="archive-date" datetime="${escapeHtml(event["日期精度"] || event["年份"])}">${formatArchiveDate(event)}</time>
    <span class="archive-kind">${classify(event)}</span>
    <div class="archive-main"><h3>${title}</h3><p>${compactMeta(event)}</p></div>
    ${event["来源URL"] ? `<a class="archive-link" href="${event["来源URL"]}" target="_blank" rel="noopener noreferrer" aria-label="查看${title}来源">↗</a>` : ""}
  </article>`;
}

function compactMeta(event) {
  return escapeHtml([event["身份"], event["地点"], event["平台/主办"]].filter(Boolean).join(" · "));
}

function renderYears() {
  const years = [...new Set(state.events.map((event) => event["年份"]))];
  el("yearList").innerHTML = years.map((year) => `<button data-year="${year}">${year}</button>`).join("");
}

function bindEvents() {
  window.addEventListener("wheel", (event) => {
    if (window.innerWidth <= 760 || postTimeline.contains(event.target) || archive.contains(event.target) || document.querySelector("dialog[open]") || el("specialScene").classList.contains("active")) return;
    event.preventDefault();
    if (state.walking) stopWalking();
    window.scrollBy({ left: event.deltaY + event.deltaX, behavior: "auto" });
  }, { passive: false });
  window.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
  journey.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
  postTimeline.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
  el("beginBtn").addEventListener("click", beginJourney);
  el("startBtn").addEventListener("click", () => { resetEndSequence(); clearJourneyTransition(); scrollToPosition(0); });
  el("endBtn").addEventListener("click", () => { resetEndSequence(); stopWalking(); scrollToPostTimelineStart(); });
  el("yearsBtn").addEventListener("click", toggleYears);
  el("closeYears").addEventListener("click", toggleYears);
  el("yearList").addEventListener("click", (event) => {
    if (!event.target.dataset.year) return;
    const index = state.events.findIndex((item) => String(item["年份"]) === event.target.dataset.year);
    jumpToTimeline(index);
    toggleYears();
  });
  el("filters").addEventListener("click", (event) => {
    if (!event.target.dataset.filter) return;
    state.currentFilter = event.target.dataset.filter;
    document.querySelectorAll(".filter-btn").forEach((button) => button.classList.toggle("active", button === event.target));
    renderArchive();
  });
  el("archiveGrid").addEventListener("click", toggleArchiveYear);
  el("searchInput").addEventListener("input", renderArchive);
  el("closeDialog").addEventListener("click", () => el("eventDialog").close());
  el("eventDialog").addEventListener("click", (event) => { if (event.target === el("eventDialog")) el("eventDialog").close(); });
  el("eventDialog").addEventListener("close", () => {
    clearTimeout(state.dialogOpenTimer);
    clearTimeout(state.dialogAutoCloseTimer);
    if (state.resumeAfterDialog) startWalking();
    state.resumeAfterDialog = false;
  });
  el("dialogImageButton").addEventListener("click", () => {
    const source = el("dialogImage");
    if (!source.src) return;
    el("dialogImageLarge").src = source.src;
    el("dialogImageLarge").alt = source.alt;
    el("imageDialog").showModal();
  });
  el("closeImageDialog").addEventListener("click", () => el("imageDialog").close());
  el("imageDialog").addEventListener("click", (event) => { if (event.target === el("imageDialog")) el("imageDialog").close(); });
  el("soundBtn").addEventListener("click", toggleSound);
  traveler.addEventListener("click", toggleWalking);
  el("specialContinue").addEventListener("click", closeSpecialScene);
  el("endScene").addEventListener("click", () => {
    if (el("endScene").classList.contains("skippable")) closeEndScene();
  });
  el("progressTrack").addEventListener("pointerdown", beginProgressDrag);
  el("progressTrack").addEventListener("pointermove", moveProgressDrag);
  el("progressTrack").addEventListener("pointerup", endProgressDrag);
  el("progressTrack").addEventListener("pointercancel", endProgressDrag);
  el("progressTrack").addEventListener("keydown", handleProgressKey);
  window.addEventListener("resize", () => {
    state.timelineMetrics = null;
    scheduleProgressUpdate();
  });
}

function toggleArchiveYear(event) {
  const button = event.target.closest(".archive-year-button");
  if (!button) return;
  const section = button.closest(".archive-year-section");
  const groups = section?.querySelector(".archive-year-groups");
  if (!section || !groups) return;
  const willExpand = button.getAttribute("aria-expanded") !== "true";
  button.setAttribute("aria-expanded", String(willExpand));
  section.classList.toggle("expanded", willExpand);
  groups.hidden = !willExpand;
}

function beginProgressDrag(event) {
  if (window.innerWidth <= 760) return;
  stopWalking();
  state.draggingProgress = true;
  event.currentTarget.classList.add("dragging");
  event.currentTarget.setPointerCapture(event.pointerId);
  seekTimelineFromPointer(event.clientX);
}

function moveProgressDrag(event) {
  if (!state.draggingProgress) return;
  seekTimelineFromPointer(event.clientX);
}

function endProgressDrag(event) {
  if (!state.draggingProgress) return;
  state.draggingProgress = false;
  event.currentTarget.classList.remove("dragging");
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
}

function seekTimelineFromPointer(clientX) {
  const rect = el("progressTrack").getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  seekTimelineToRatio(ratio);
}

function seekTimelineToRatio(ratio) {
  const timelineStart = el("timeline").offsetLeft;
  const timelineTravel = el("timeline").offsetWidth - innerWidth;
  window.scrollTo({ left: timelineStart + ratio * timelineTravel, behavior: "auto" });
}

function handleProgressKey(event) {
  if (window.innerWidth <= 760) return;
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(event.key)) return;
  event.preventDefault();
  stopWalking();
  const current = Number(el("progressTrack").getAttribute("aria-valuenow") || 2007);
  if (event.key === "Home") return seekTimelineToRatio(0);
  if (event.key === "End") return seekTimelineToRatio(1);
  const year = Math.max(2007, Math.min(2026, current + (event.key === "ArrowRight" ? 1 : -1)));
  seekTimelineToRatio((year - 2007) / 19);
}

function jumpToTimeline(index, behavior = "smooth") {
  stopWalking();
  const safeIndex = Math.max(0, Math.min(state.events.length - 1, index));
  const node = document.querySelector(`.event-node[data-index="${safeIndex}"] .node-button`);
  if (!node) return;
  const nodeRect = node.getBoundingClientRect();
  if (window.innerWidth > 760) {
    const targetX = nodeRect.left + scrollX + nodeRect.width / 2 - innerWidth * .5;
    window.scrollTo({ left: targetX, behavior });
    return;
  }
  const targetY = nodeRect.top + scrollY + nodeRect.height / 2 - innerHeight * .48;
  window.scrollTo({ top: targetY, behavior });
}

function clearJourneyTransition() {
  state.journeyTransitionTimers.forEach(clearTimeout);
  state.journeyTransitionTimers = [];
  state.transitioningJourney = false;
  clearTimeout(state.beginJourneyTimer);
  document.body.classList.remove("journey-transitioning", "portal-transition-active", "portal-transition-warp", "portal-transition-reveal");
}

function queueJourneyTransition(callback, delay) {
  const timer = setTimeout(() => {
    state.journeyTransitionTimers = state.journeyTransitionTimers.filter((item) => item !== timer);
    callback();
  }, delay);
  state.journeyTransitionTimers.push(timer);
  return timer;
}

function beginJourney() {
  resetEndSequence();
  clearJourneyTransition();
  stopWalking();
  state.transitioningJourney = true;
  document.body.classList.add("journey-transitioning", "portal-transition-active");
  requestAnimationFrame(() => document.body.classList.add("portal-transition-warp"));
  queueJourneyTransition(() => {
    jumpToTimeline(0, "auto");
    traveler.dataset.era = "1";
    traveler.classList.add("journey-ready");
    traveler.style.opacity = "1";
    document.body.classList.add("timeline-launched", "timeline-active", "portal-transition-reveal");
    updateProgress();
  }, 900);
  state.beginJourneyTimer = queueJourneyTransition(() => {
    traveler.dataset.era = "1";
    traveler.classList.add("journey-ready");
    traveler.style.opacity = "1";
    document.body.classList.add("timeline-launched", "timeline-active");
    traveler.focus({ preventScroll: true });
    document.body.classList.remove("journey-transitioning", "portal-transition-active", "portal-transition-warp", "portal-transition-reveal");
    state.transitioningJourney = false;
    startWalking();
  }, 1880);
}

function scrollToPosition(position) {
  if (position <= 0) document.body.classList.remove("timeline-launched");
  stopWalking();
  scrollJourneyTo(position, "smooth");
}

function scrollToPostTimelineStart() {
  if (window.innerWidth > 760) {
    postTimeline.scrollTo({ top: 0, behavior: "auto" });
    window.scrollTo({ left: postTimeline.offsetLeft, behavior: "smooth" });
    return;
  }
  accounts.scrollIntoView({ behavior: "smooth" });
}

function scheduleProgressUpdate() {
  if (state.progressFrame) return;
  state.progressFrame = requestAnimationFrame(() => {
    state.progressFrame = 0;
    updateProgress();
  });
}

function getTimelineMetrics() {
  const desktop = window.innerWidth > 760;
  const timeline = el("timeline");
  const viewportSize = desktop ? innerWidth : innerHeight;
  const start = desktop ? timeline.offsetLeft : timeline.offsetTop;
  const length = Math.max(1, desktop ? timeline.offsetWidth - innerWidth : timeline.offsetHeight - innerHeight);
  const travelerRatio = desktop ? .5 : .48;
  const lastNodeCenter = desktop
    ? timeline.offsetLeft + track.offsetLeft + track.offsetWidth
    : timeline.offsetTop + track.offsetTop + track.offsetHeight;
  return {
    desktop,
    start,
    length,
    viewportSize,
    journeyStart: start - viewportSize * (desktop ? .55 : .3),
    journeyEnd: lastNodeCenter - viewportSize * travelerRatio + 24,
  };
}

function updateProgress() {
  const metrics = state.timelineMetrics || (state.timelineMetrics = getTimelineMetrics());
  const { desktop, start, length, viewportSize, journeyStart, journeyEnd } = metrics;
  const position = getJourneyPosition();
  const postContentActive = desktop
    ? position >= postTimeline.offsetLeft - viewportSize * .5
    : postTimeline.getBoundingClientRect().top < viewportSize * .5;
  const wasPostContentActive = document.body.classList.contains("post-content-active");
  document.body.classList.toggle("post-content-active", postContentActive);
  if (wasPostContentActive && !postContentActive) document.dispatchEvent(new Event("stars-resume"));
  const ratio = Math.max(0, Math.min(1, (position - start) / length));
  const index = Math.min(state.events.length - 1, Math.round(ratio * (state.events.length - 1)));
  if (Math.abs(ratio - state.lastProgressRatio) > .002) {
    el("progressFill").style.transform = `scaleX(${ratio})`;
    state.lastProgressRatio = ratio;
  }
  el("progressYear").textContent = state.events[index]?.["年份"] || "2007";
  el("progressTrack").setAttribute("aria-valuenow", state.events[index]?.["年份"] || "2007");
  const year = Number(state.events[index]?.["年份"] || 2007);
  const era = year >= 2021 ? 3 : year >= 2016 ? 2 : 1;
  const previousEra = Number(traveler.dataset.era || era);
  traveler.dataset.era = era;
  if (previousEra !== era) {
    traveler.classList.remove("transforming");
    void traveler.offsetWidth;
    traveler.classList.add("transforming");
    clearTimeout(state.transformTimer);
    state.transformTimer = setTimeout(() => traveler.classList.remove("transforming"), 1050);
  }
  const journeyActive = position >= journeyStart && position <= journeyEnd;
  if (!state.transitioningJourney && position < start - viewportSize * (desktop ? .8 : .46)) {
    document.body.classList.remove("timeline-launched");
  }
  const targetOpacity = journeyActive ? "1" : "0";
  const targetPointerEvents = journeyActive ? "auto" : "none";
  if (traveler.style.opacity !== targetOpacity) traveler.style.opacity = targetOpacity;
  if (traveler.style.pointerEvents !== targetPointerEvents) traveler.style.pointerEvents = targetPointerEvents;
  if (document.body.classList.contains("timeline-active") !== journeyActive) {
    document.body.classList.toggle("timeline-active", journeyActive);
  }
}

function isSpecialEvent(event) {
  return event["是否是特殊节点"] === "是";
}

function toggleWalking() {
  if (state.walking) {
    stopWalking();
    return;
  }
  const desktop = window.innerWidth > 760;
  const position = getJourneyPosition();
  const timelineStart = desktop ? el("timeline").offsetLeft : el("timeline").offsetTop;
  const postStart = desktop ? postTimeline.offsetLeft : archive.offsetTop;
  const viewportSize = desktop ? innerWidth : innerHeight;
  if (position < timelineStart - viewportSize * .6 || position >= postStart - viewportSize * .4) {
    jumpToTimeline(0);
    setTimeout(startWalking, 650);
    return;
  }
  startWalking();
}

function startWalking() {
  if (state.walking || el("specialScene").classList.contains("active") || el("endScene").classList.contains("active") || document.querySelector("dialog[open]")) return;
  state.walking = true;
  state.lastWalkTime = 0;
  traveler.classList.add("walking");
  el("travelerStatus").textContent = "旅途中 · 点击暂停";
  traveler.setAttribute("aria-label", "暂停小光人的旅程");
  state.walkFrame = requestAnimationFrame(walkStep);
}

function stopWalking() {
  state.walking = false;
  cancelAnimationFrame(state.walkFrame);
  traveler.classList.remove("walking");
  if (el("travelerStatus")) el("travelerStatus").textContent = "点击继续";
  traveler.setAttribute("aria-label", "继续小光人的旅程");
}

function walkStep(timestamp) {
  if (!state.walking) return;
  if (!state.lastWalkTime) state.lastWalkTime = timestamp;
  const delta = Math.min(40, timestamp - state.lastWalkTime);
  state.lastWalkTime = timestamp;
  const desktop = window.innerWidth > 760;
  const position = getJourneyPosition();
  const viewportSize = desktop ? innerWidth : innerHeight;
  const travelerRatio = desktop ? .5 : .48;
  const focusPosition = position + viewportSize * travelerRatio;
  const nextPosition = position + WALK_SPEED * delta / 1000;
  const nextFocusPosition = nextPosition + viewportSize * travelerRatio;
  const special = findCrossedSpecial(focusPosition, nextFocusPosition, desktop);
  if (special) {
    const specialRect = special.node.getBoundingClientRect();
    const targetPosition = desktop
      ? specialRect.left + scrollX + specialRect.width / 2 - innerWidth * travelerRatio
      : specialRect.top + scrollY + specialRect.height / 2 - innerHeight * travelerRatio;
    scrollJourneyTo(targetPosition, "auto");
    state.reachedSpecials.add(special.event["活动ID"]);
    stopWalking();
    setTimeout(() => openEvent(special.event, special.node.closest(".event-node"), { auto: true }), 180);
    return;
  }
  const lastNode = track.querySelector(".event-node:last-of-type");
  const lastRect = lastNode?.getBoundingClientRect();
  const lastNodeCenter = lastRect
    ? (desktop ? lastRect.left + scrollX + lastRect.width / 2 : lastRect.top + scrollY + lastRect.height / 2)
    : Infinity;
  if (nextFocusPosition >= lastNodeCenter) {
    stopWalking();
    beginEndSequence();
    return;
  }
  scrollJourneyTo(nextPosition, "auto");
  state.walkFrame = requestAnimationFrame(walkStep);
}

function beginEndSequence() {
  if (state.endSequenceStarted) return;
  state.endSequenceStarted = true;
  state.endSceneTimers.push(setTimeout(showEndScene, 1000));
}

function showEndScene() {
  const scene = el("endScene");
  document.body.classList.add("end-scene-active");
  scene.classList.add("active");
  scene.setAttribute("aria-hidden", "false");
  state.endSceneTimers.push(setTimeout(() => scene.classList.add("copy-visible"), 500));
  state.endSceneTimers.push(setTimeout(() => scene.classList.add("skippable"), 10500));
  state.endSceneTimers.push(setTimeout(closeEndScene, 20500));
}

function closeEndScene() {
  const scene = el("endScene");
  document.body.classList.remove("end-scene-active");
  scene.classList.remove("copy-visible", "skippable", "active");
  scene.setAttribute("aria-hidden", "true");
  state.endSceneTimers = [];
  state.endSequenceStarted = false;
  scrollToPostTimelineStart();
}

function resetEndSequence() {
  state.endSceneTimers.forEach(clearTimeout);
  state.endSceneTimers = [];
  state.endSequenceStarted = false;
  const scene = el("endScene");
  document.body.classList.remove("end-scene-active");
  scene.classList.remove("copy-visible", "skippable", "active");
  scene.setAttribute("aria-hidden", "true");
}

function findCrossedSpecial(currentPosition, nextPosition, desktop) {
  for (const event of state.events) {
    const id = event["活动ID"];
    if (!isSpecialEvent(event) || state.reachedSpecials.has(id)) continue;
    const node = document.querySelector(`.event-node[data-id="${id}"] .node-button`);
    if (!node) continue;
    const nodeRect = node.getBoundingClientRect();
    const nodePosition = desktop
      ? nodeRect.left + scrollX + nodeRect.width / 2
      : nodeRect.top + scrollY + nodeRect.height / 2;
    if (Math.abs(nodePosition - currentPosition) < 8 || (nodePosition > currentPosition && nodePosition <= nextPosition + 2)) return { event, node };
  }
  return null;
}

function showSpecialScene(event) {
  el("specialMeta").textContent = `${event["日期精度"]} · ${event["类别"]}`;
  el("specialTitle").textContent = event["活动/事件名称"];
  el("specialNote").textContent = event["备注"] || "特别素材将在这里完整呈现。";
  el("specialScene").classList.add("active");
  el("specialScene").setAttribute("aria-hidden", "false");
  el("flash").classList.remove("active");
  void el("flash").offsetWidth;
  el("flash").classList.add("active");
  drawSpecialEffect();
  playChime();
}

function closeSpecialScene() {
  el("specialScene").classList.remove("active");
  el("specialScene").setAttribute("aria-hidden", "true");
  cancelAnimationFrame(state.specialAnimation);
  startWalking();
}

function drawSpecialEffect() {
  const canvas = el("specialCanvas");
  const context = canvas.getContext("2d");
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  const particles = Array.from({ length: 120 }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: Math.random() * Math.min(innerWidth, innerHeight) * .46,
    speed: .001 + Math.random() * .003,
    size: .5 + Math.random() * 2,
  }));
  const draw = (time = 0) => {
    if (document.hidden || document.body.classList.contains("post-content-active")) return;
    context.clearRect(0, 0, innerWidth, innerHeight);
    particles.forEach((particle) => {
      const angle = particle.angle + time * particle.speed;
      const x = innerWidth / 2 + Math.cos(angle) * particle.radius;
      const y = innerHeight / 2 + Math.sin(angle) * particle.radius * .56;
      context.fillStyle = `rgba(255,225,135,${.25 + particle.size / 3})`;
      context.beginPath();
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fill();
    });
    state.specialAnimation = requestAnimationFrame(draw);
  };
  draw();
}

function toggleYears() {
  const panel = el("yearPanel");
  panel.classList.toggle("open");
  panel.setAttribute("aria-hidden", String(!panel.classList.contains("open")));
}

function toggleSound() {
  if (state.audio) {
    if (state.audio.paused && !state.audio.ended) {
      state.audio.play().catch(() => {});
      el("soundBtn").classList.add("active");
    } else if (!state.audio.paused) {
      state.audio.pause();
      el("soundBtn").classList.remove("active");
    }
    return;
  }
  if (state.audioPlayed) return;
  const audio = new Audio("assets/bgm-i-love-you.mp3");
  audio.preload = "auto";
  audio.addEventListener("ended", () => {
    el("soundBtn").classList.remove("active");
    el("soundBtn").setAttribute("aria-label", "背景音乐已播放完毕");
  }, { once: true });
  state.audio = audio;
  state.audioPlayed = true;
  audio.play().catch(() => {
    state.audioPlayed = false;
    state.audio = null;
  });
  el("soundBtn").classList.add("active");
}

function playChime() {
  // 特殊节点不再叠加额外音效，避免与 BGM 争用音频通道。
}

function initStars() {
  const canvas = el("starfield");
  const ctx = canvas.getContext("2d");
  const liStar = new Image();
  liStar.src = "assets/li-star.png";
  let stars = [];
  let streamDefs = [];
  let streamParticles = [];
  const curvePoint = (stream, t) => {
    const u = 1 - t;
    return {
      x: u ** 3 * stream.p0.x + 3 * u ** 2 * t * stream.p1.x + 3 * u * t ** 2 * stream.p2.x + t ** 3 * stream.p3.x,
      y: u ** 3 * stream.p0.y + 3 * u ** 2 * t * stream.p1.y + 3 * u * t ** 2 * stream.p2.y + t ** 3 * stream.p3.y,
    };
  };
  const curveTangent = (stream, t) => {
    const u = 1 - t;
    return {
      x: 3 * u ** 2 * (stream.p1.x - stream.p0.x) + 6 * u * t * (stream.p2.x - stream.p1.x) + 3 * t ** 2 * (stream.p3.x - stream.p2.x),
      y: 3 * u ** 2 * (stream.p1.y - stream.p0.y) + 6 * u * t * (stream.p2.y - stream.p1.y) + 3 * t ** 2 * (stream.p3.y - stream.p2.y),
    };
  };
  const resize = () => {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.2);
    canvas.width = Math.ceil(innerWidth * pixelRatio);
    canvas.height = Math.ceil(innerHeight * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const wide = innerWidth > 760;
    const area = innerWidth * innerHeight;
    const streamWidth = Math.max(38, Math.min(118, innerWidth * (wide ? .06 : .18)));
    streamDefs = [
      {
        p0: { x: innerWidth * (wide ? .42 : .24), y: innerHeight * 1.10 },
        p1: { x: innerWidth * (wide ? .46 : .34), y: innerHeight * .74 },
        p2: { x: innerWidth * (wide ? .50 : .50), y: innerHeight * .28 },
        p3: { x: innerWidth * (wide ? .61 : .72), y: innerHeight * -.16 },
        width: streamWidth * 1.36,
        warm: .72,
      },
      {
        p0: { x: innerWidth * (wide ? .54 : .48), y: innerHeight * 1.14 },
        p1: { x: innerWidth * (wide ? .55 : .52), y: innerHeight * .70 },
        p2: { x: innerWidth * (wide ? .59 : .61), y: innerHeight * .30 },
        p3: { x: innerWidth * (wide ? .70 : .84), y: innerHeight * -.11 },
        width: streamWidth * 1.02,
        warm: .88,
      },
      {
        p0: { x: innerWidth * (wide ? .30 : .18), y: innerHeight * 1.08 },
        p1: { x: innerWidth * (wide ? .35 : .25), y: innerHeight * .73 },
        p2: { x: innerWidth * (wide ? .38 : .37), y: innerHeight * .33 },
        p3: { x: innerWidth * (wide ? .46 : .56), y: innerHeight * -.13 },
        width: streamWidth * .78,
        warm: .36,
      },
    ];
    stars = Array.from({ length: Math.min(190, Math.floor(area / 7800)) }, () => {
      const isLi = Math.random() < .055;
      return { x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: Math.random() * 1.25 + .2, a: Math.random(), s: Math.random() * .008 + .002, isLi, size: Math.random() * 22 + 24, rotation: (Math.random() - .5) * .34 };
    });
    streamParticles = Array.from({ length: Math.min(wide ? 360 : 240, Math.floor(area / (wide ? 4200 : 2900))) }, () => {
      const streamIndex = Math.floor(Math.random() * streamDefs.length);
      const stream = streamDefs[streamIndex];
      return {
        streamIndex,
        t: Math.random(),
        offset: (Math.random() - .5) * stream.width,
        size: Math.random() * 1.9 + .28,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * .00012 + .00004,
        trail: Math.random() * 10 + 3,
        tone: Math.random(),
      };
    });
  };
  let lastStarDrawTime = 0;
  const drawStream = (time, reduced) => {
    streamDefs.forEach((stream, index) => {
      if (reduced && index > 1) return;
      const gradient = ctx.createLinearGradient(stream.p0.x, stream.p0.y, stream.p3.x, stream.p3.y);
      gradient.addColorStop(0, "rgba(55,160,255,0)");
      gradient.addColorStop(.24, "rgba(91,184,255,.08)");
      gradient.addColorStop(.50, "rgba(255,252,218,.42)");
      gradient.addColorStop(.64, "rgba(255,211,93,.26)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = reduced ? .07 + index * .012 : .12 + index * .018;
      ctx.lineWidth = stream.width * .20;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255,219,105,.36)";
      ctx.shadowBlur = reduced ? 0 : 24;
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(stream.p0.x, stream.p0.y);
      ctx.bezierCurveTo(stream.p1.x, stream.p1.y, stream.p2.x, stream.p2.y, stream.p3.x, stream.p3.y);
      ctx.stroke();
      ctx.globalAlpha = reduced ? .12 : .26;
      ctx.lineWidth = Math.max(1, stream.width * .012);
      ctx.shadowBlur = reduced ? 0 : 12;
      ctx.strokeStyle = stream.warm > .5 ? "rgba(255,248,206,.48)" : "rgba(151,218,255,.34)";
      (reduced ? [0] : [0, .35, -.34]).forEach((offset, filamentIndex) => {
        ctx.beginPath();
        for (let step = 0; step <= 36; step += 1) {
          const t = step / 36;
          const point = curvePoint(stream, t);
          const tangent = curveTangent(stream, t);
          const length = Math.hypot(tangent.x, tangent.y) || 1;
          const normal = { x: -tangent.y / length, y: tangent.x / length };
          const wobble = Math.sin(time * .00035 + t * 11 + index + filamentIndex) * stream.width * .025;
          const x = point.x + normal.x * (offset * stream.width * .24 + wobble);
          const y = point.y + normal.y * (offset * stream.width * .24 + wobble);
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.restore();
    });
  };
  const draw = (time = 0) => {
    const reduced = state.walking || document.body.classList.contains("timeline-active");
    const minFrameGap = reduced ? 50 : 33;
    if (lastStarDrawTime && time - lastStarDrawTime < minFrameGap) {
      requestAnimationFrame(draw);
      return;
    }
    lastStarDrawTime = time;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    drawStream(time, reduced);
    streamParticles.forEach((particle) => {
      const stream = streamDefs[particle.streamIndex];
      particle.t -= particle.speed;
      if (particle.t < 0) particle.t += 1;
      const point = curvePoint(stream, particle.t);
      const tangent = curveTangent(stream, particle.t);
      const length = Math.hypot(tangent.x, tangent.y) || 1;
      const normal = { x: -tangent.y / length, y: tangent.x / length };
      const drift = Math.sin(time * .0014 + particle.phase) * 7;
      const x = point.x + normal.x * (particle.offset + drift);
      const y = point.y + normal.y * (particle.offset + drift);
      const edgeFade = Math.sin(particle.t * Math.PI);
      const pulse = .42 + Math.abs(Math.sin(time * .002 + particle.phase)) * .58;
      const alpha = Math.max(0, Math.min(.98, edgeFade * pulse * (.56 + particle.size / 3.2)));
      const warmSpark = particle.tone < stream.warm;
      const whiteSpark = particle.tone > .84;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      ctx.fillStyle = whiteSpark ? "rgba(255,255,255,.98)" : warmSpark ? "rgba(255,238,166,.96)" : "rgba(156,219,255,.88)";
      ctx.shadowColor = whiteSpark ? "rgba(255,255,255,.92)" : warmSpark ? "rgba(255,217,101,.86)" : "rgba(102,201,255,.70)";
      ctx.shadowBlur = reduced ? 0 : particle.size * 5.5 + 4;
      if (!reduced && particle.size > 1.08) {
        ctx.strokeStyle = warmSpark ? "rgba(255,238,178,.32)" : "rgba(142,217,255,.23)";
        ctx.lineWidth = particle.size * .46;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x + tangent.x / length * particle.trail, y + tangent.y / length * particle.trail);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      if (!reduced && particle.size > 1.65 && particle.tone > .78) {
        ctx.globalAlpha = alpha * .72;
        ctx.strokeStyle = "rgba(255,250,218,.52)";
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(x - particle.size * 3.5, y);
        ctx.lineTo(x + particle.size * 3.5, y);
        ctx.moveTo(x, y - particle.size * 3.5);
        ctx.lineTo(x, y + particle.size * 3.5);
        ctx.stroke();
      }
      ctx.restore();
    });
    stars.forEach((star) => {
      star.a += star.s;
      const alpha = .2 + Math.abs(Math.sin(star.a)) * .7;
      if (star.isLi && liStar.complete && liStar.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = alpha * .66;
        ctx.translate(star.x, star.y);
        ctx.rotate(star.rotation);
        const height = star.size * liStar.naturalHeight / liStar.naturalWidth;
        ctx.drawImage(liStar, -star.size / 2, -height / 2, star.size, height);
        ctx.restore();
      } else {
        ctx.fillStyle = `rgba(255,240,190,${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    requestAnimationFrame(draw);
  };
  resize();
  draw();
  document.addEventListener("stars-resume", () => requestAnimationFrame(draw), { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !document.body.classList.contains("post-content-active")) requestAnimationFrame(draw);
  }, { passive: true });
  window.addEventListener("resize", resize);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:40px;color:white">资料加载失败，请通过本地服务器打开网页。</main>`;
});
