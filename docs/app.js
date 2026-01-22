let activeView = "all";
let calendarData = null;
let lastUpdated = null;

fetch("./calendar.json")
  .then(res => res.json())
  .then(payload => {
    // Handle BOTH old and new JSON shapes safely
    if (payload.generated_at && payload.data) {
      calendarData = payload.data;
      const d = new Date(payload.generated_at);
      if (!isNaN(d)) lastUpdated = d;
    } else {
      // Old format fallback
      calendarData = payload;
    }

    render(calendarData);
  })
  .catch(err => {
    document.body.innerHTML =
      "<h2>Error loading data</h2><pre>" + err.message + "</pre>";
  });

function render(data) {
  const root = document.getElementById("calendar");
  root.innerHTML = "";

  renderHeader(root);
  renderToggle(root);

  const byMonth = {};
  Object.keys(data).forEach(d => {
    const ym = d.slice(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(d);
  });

  Object.keys(byMonth).sort().forEach(monthKey => {
    const [y, m] = monthKey.split("-").map(Number);
    const monthBlock = document.createElement("div");
    monthBlock.className = "month";

    const title = document.createElement("h2");
    title.textContent = new Date(y, m - 1, 1).toLocaleString("default", {
      month: "long",
      year: "numeric"
    });
    monthBlock.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d => {
      const el = document.createElement("div");
      el.className = "dow";
      el.textContent = d;
      grid.appendChild(el);
    });

    const firstDow = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();

    for (let i = 0; i < firstDow; i++) {
      grid.appendChild(document.createElement("div"));
    }

    const details = document.createElement("div");
    details.className = "month-details";
    details.innerHTML = "<em>Click a day above</em>";

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement("div");
      cell.className = "day-cell";

      const iso = `${y}-${String(m).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const label = document.createElement("div");
      label.className = "day-number";
      label.textContent = day;
      cell.appendChild(label);

      if (data[iso] && data[iso][activeView]) {
        const info = data[iso][activeView];

        if (info.count > 0) {
          cell.classList.add(colorClass(info.count));

          const count = document.createElement("div");
          count.className = "day-count";
          count.textContent = info.count;
          cell.appendChild(count);

          cell.onclick = () => {
            details.innerHTML = `
              <h4>${iso}</h4>
              <strong>Approved (${info.approved.length})</strong>
              <ul>${info.approved.map(n => `<li>${n}</li>`).join("") || "<li>None</li>"}</ul>
              <strong>Pending (${info.pending.length})</strong>
              <ul>${info.pending.map(n => `<li class="pending">${n}</li>`).join("") || "<li>None</li>"}</ul>
            `;
          };
        }
      }

      grid.appendChild(cell);
    }

    monthBlock.appendChild(grid);
    monthBlock.appendChild(details);
    root.appendChild(monthBlock);
  });
}

function renderHeader(root) {
  const wrap = document.createElement("div");
  wrap.className = "helper-text tooltip";

  if (lastUpdated) {
    wrap.textContent =
      "Last updated: " +
      lastUpdated.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      });
  } else {
    wrap.textContent = "Last updated: updating…";
  }

  wrap.setAttribute(
    "data-tooltip",
    "Counts include approved and pending time-off requests. Use FOH/BOH to filter."
  );

  root.appendChild(wrap);
}

function renderToggle(root) {
  const wrap = document.createElement("div");
  wrap.className = "toggle";

  ["all","foh","boh"].forEach(k => {
    const btn = document.createElement("button");
    btn.textContent = k.toUpperCase();
    if (k === activeView) btn.classList.add("active");
    btn.onclick = () => {
      activeView = k;
      render(calendarData);
    };
    wrap.appendChild(btn);
  });

  root.appendChild(wrap);
}

function colorClass(count) {
  if (count <= 2) return "low";
  if (count <= 5) return "medium";
  return "high";
}
