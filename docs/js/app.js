const DATA_URL = "data/lectures.json";

const state = {
  lectures: [],
  genreCatalog: [],
  genreCounts: {},
  filters: {
    query: "",
    genre: "",
    category: "",
    speaker: "",
    year: "",
  },
};

const elements = {
  updatedAt: document.getElementById("updated-at"),
  statCount: document.getElementById("stat-count"),
  statSpeakers: document.getElementById("stat-speakers"),
  statCategories: document.getElementById("stat-categories"),
  genreChips: document.getElementById("genre-chips"),
  heroSearchInput: document.getElementById("hero-search-input"),
  searchInput: document.getElementById("search-input"),
  searchBtn: document.getElementById("search-btn"),
  filterCategory: document.getElementById("filter-category"),
  filterSpeaker: document.getElementById("filter-speaker"),
  filterYear: document.getElementById("filter-year"),
  resetFilters: document.getElementById("reset-filters"),
  resultCount: document.getElementById("result-count"),
  lectureList: document.getElementById("lecture-list"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatUpdatedAt(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function extractYear(lecture) {
  if (lecture.dateIso) return lecture.dateIso.slice(0, 4);
  const match = (lecture.date || "").match(/^(\d{4})/);
  return match ? match[1] : "";
}

function genreLabel(id) {
  return state.genreCatalog.find((genre) => genre.id === id)?.label || id;
}

function populateSelect(select, values, label) {
  const current = select.value;
  select.innerHTML = `<option value="">すべて</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (values.includes(current)) select.value = current;
  select.setAttribute("aria-label", label);
}

function buildFilterOptions(lectures) {
  const categories = [...new Set(lectures.map((l) => l.activityType).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
  const speakers = [...new Set(lectures.map((l) => l.name).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
  const years = [...new Set(lectures.map(extractYear).filter(Boolean))].sort((a, b) =>
    b.localeCompare(a)
  );

  populateSelect(elements.filterCategory, categories, "活動種別");
  populateSelect(elements.filterSpeaker, speakers, "講演者");
  populateSelect(elements.filterYear, years, "開催年");
}

function buildGenreChips() {
  if (!elements.genreChips) return;

  const activeGenres = state.genreCatalog.filter(
    (genre) => (state.genreCounts[genre.id] || 0) > 0
  );

  elements.genreChips.innerHTML = activeGenres
    .map((genre) => {
      const count = state.genreCounts[genre.id] || 0;
      const isActive = state.filters.genre === genre.id;
      return `
        <button
          type="button"
          class="genre-chip${isActive ? " is-active" : ""}"
          data-genre="${escapeHtml(genre.id)}"
          aria-pressed="${isActive}"
        >
          ${escapeHtml(genre.label)}
          <span class="genre-chip-count">${count}</span>
        </button>
      `;
    })
    .join("");
}

function updateStats(lectures, updatedAt) {
  const speakers = new Set(lectures.map((l) => l.name).filter(Boolean));
  const genresUsed = new Set(lectures.flatMap((l) => l.genres || []));

  elements.statCount.textContent = String(lectures.length);
  elements.statSpeakers.textContent = String(speakers.size);
  elements.statCategories.textContent = String(genresUsed.size);
  elements.updatedAt.textContent = formatUpdatedAt(updatedAt);
}

function matchesQuery(lecture, query) {
  if (!query) return true;
  const genreLabels = (lecture.genres || []).map(genreLabel).join(" ");
  const haystack = [
    lecture.title,
    lecture.name,
    lecture.eventName,
    lecture.location,
    lecture.notes,
    lecture.activityType,
    lecture.category,
    genreLabels,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function getFilteredLectures() {
  const { query, genre, category, speaker, year } = state.filters;
  return state.lectures.filter((lecture) => {
    if (genre && !(lecture.genres || []).includes(genre)) return false;
    if (category && lecture.activityType !== category) return false;
    if (speaker && lecture.name !== speaker) return false;
    if (year && extractYear(lecture) !== year) return false;
    return matchesQuery(lecture, query);
  });
}

function renderGenreBadges(genres) {
  if (!genres?.length) return "";
  return genres
    .map((id) => `<span class="badge badge-genre">${escapeHtml(genreLabel(id))}</span>`)
    .join("");
}

function renderLectureEntry(lecture) {
  const dateLabel = lecture.date || "日付未登録";
  const notes = lecture.notes
    ? `<p class="lecture-notes">${escapeHtml(lecture.notes)}</p>`
    : "";
  const genreBadges = renderGenreBadges(lecture.genres);

  return `
    <article class="lecture-entry" data-id="${escapeHtml(lecture.id)}">
      <div class="lecture-entry-header">
        <span class="badge">${escapeHtml(lecture.activityType || lecture.category || "未分類")}</span>
        ${genreBadges}
        <span class="badge-date">${escapeHtml(dateLabel)}</span>
      </div>
      <h3 class="lecture-title">${escapeHtml(lecture.title)}</h3>
      <dl class="lecture-meta">
        <div class="lecture-meta-item">
          <dt>講演者</dt>
          <dd>${escapeHtml(lecture.name)}</dd>
        </div>
        <div class="lecture-meta-item">
          <dt>会の名称</dt>
          <dd>${escapeHtml(lecture.eventName || "—")}</dd>
        </div>
        <div class="lecture-meta-item">
          <dt>開催場所</dt>
          <dd>${escapeHtml(lecture.location || "—")}</dd>
        </div>
      </dl>
      ${notes}
    </article>
  `;
}

function render() {
  const filtered = getFilteredLectures();
  elements.resultCount.textContent = `${filtered.length} 件の講演（全 ${state.lectures.length} 件）`;
  buildGenreChips();

  if (filtered.length === 0) {
    elements.lectureList.innerHTML =
      '<p class="state-message">条件に一致する講演がありません。検索条件を変更してください。</p>';
    return;
  }

  elements.lectureList.innerHTML = filtered.map(renderLectureEntry).join("");
}

function applyQuery(query) {
  state.filters.query = query.trim();
  elements.searchInput.value = state.filters.query;
  if (elements.heroSearchInput) {
    elements.heroSearchInput.value = state.filters.query;
  }
  render();
}

function setGenre(genreId) {
  state.filters.genre = state.filters.genre === genreId ? "" : genreId;
  render();
}

function resetFilters() {
  state.filters = { query: "", genre: "", category: "", speaker: "", year: "" };
  elements.searchInput.value = "";
  if (elements.heroSearchInput) elements.heroSearchInput.value = "";
  elements.filterCategory.value = "";
  elements.filterSpeaker.value = "";
  elements.filterYear.value = "";
  render();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    applyQuery(event.target.value);
  });

  if (elements.heroSearchInput) {
    elements.heroSearchInput.addEventListener("input", (event) => {
      applyQuery(event.target.value);
    });
    elements.heroSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("search")?.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  elements.searchBtn.addEventListener("click", () => {
    applyQuery(elements.searchInput.value);
    document.getElementById("lectures")?.scrollIntoView({ behavior: "smooth" });
  });

  elements.genreChips?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-genre]");
    if (!chip) return;
    setGenre(chip.dataset.genre);
  });

  elements.filterCategory.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    render();
  });

  elements.filterSpeaker.addEventListener("change", (event) => {
    state.filters.speaker = event.target.value;
    render();
  });

  elements.filterYear.addEventListener("change", (event) => {
    state.filters.year = event.target.value;
    render();
  });

  elements.resetFilters.addEventListener("click", resetFilters);
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`データの読み込みに失敗しました (${response.status})`);

    const data = await response.json();
    state.lectures = data.lectures || [];
    state.genreCatalog = data.genres || [];
    state.genreCounts = data.genreCounts || {};

    updateStats(state.lectures, data.updatedAt);
    buildFilterOptions(state.lectures);
    render();
  } catch (error) {
    console.error(error);
    elements.updatedAt.textContent = "読み込み失敗";
    elements.lectureList.innerHTML = `<p class="state-message error-state">${escapeHtml(error.message)}</p>`;
  }
}

bindEvents();
loadData();
