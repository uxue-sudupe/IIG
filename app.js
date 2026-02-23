// ============================================================
// EIGE 2025 — Dumbbell grafikoa + eskuineko azalpen-panela
// ============================================================
// Fitxategiak:
//  - ./data/dumbbell_2025.csv
//  - ./data/indicator_info_eu.json
//
// OHARRA: indicator_info_eu.json-eko gakoek (keys) CSVko
// "adierazlea" zutabeko testuarekin BAT ETORRI behar dute.
// ============================================================

const CSV_PATH = "./data/dumbbell_2025.csv";
const INFO_PATH = "./data/indicator_info_eu.json";

const elIndicator = document.getElementById("adierazleSelect");

// Eskuineko panelaren elementuak
const elInfoTitle = document.getElementById("infoTitle");
const elInfoDesc  = document.getElementById("infoDesc");
const elInfoUnit  = document.getElementById("infoUnit");

let ROWS = [];
let INFO = {};

function uniq(arr) {
  return [...new Set(arr)];
}

function setOptions(selectEl, values) {
  selectEl.innerHTML = "";
  values.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });
}

// CSV parser sinplea (komaz bereiztua, komatxoekin ere bai)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"'; // escape ""
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }

  // azken lerroa
  row.push(cur);
  if (row.length > 1 || row[0] !== "") rows.push(row);

  return rows;
}

function parseNumber(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  if (!s) return null;
  const n = Number(s.replace(",", ".")); // badaezpada
  return Number.isFinite(n) ? n : null;
}

// Azalpen-panela eguneratu
function updateInfoPanel(indicator) {
  const info = INFO?.[indicator];

  if (!elInfoTitle || !elInfoDesc || !elInfoUnit) return; // HTML-ean panelik ez badago

  if (!info) {
    elInfoTitle.textContent = indicator;
    elInfoDesc.textContent = "Adierazle honen deskribapena ez dago oraindik eskuragarri.";
    elInfoUnit.textContent = "";
    return;
  }

  elInfoTitle.textContent = info.title || indicator;
  elInfoDesc.textContent  = info.desc || "";
  elInfoUnit.textContent  = info.unit ? `Unitatea: ${info.unit}` : "";
}

function render(indicator) {
  updateInfoPanel(indicator);

  const data = ROWS.filter(r => r.adierazlea === indicator);

  // X ardatza: eremuak/herrialdeak
  const categories = data.map(r => r.eremua);

  // Dumbbell: low=women, high=men
  const seriesData = data.map(r => ({
    name: r.eremua,
    low: r.women,
    high: r.men,
    women: r.women,
    men: r.men,
    gap: r.arrakala
  }));

  Highcharts.chart("container", {
    chart: { type: "dumbbell", inverted: false },
    title: { text: indicator },
    subtitle: { text: "2025" },

    xAxis: {
      categories,
      labels: { rotation: -90 }
    },

    yAxis: {
      title: { text: "Balioa" },
      gridLineDashStyle: "Dash"
    },

    legend: { enabled: false },

    tooltip: {
      pointFormatter: function () {
        const g = (this.gap ?? (this.men - this.women));
        return `
          <b>${this.name}</b><br/>
          Emakumeak: ${this.women}<br/>
          Gizonak: ${this.men}<br/>
          Arrakala (G - E): ${Number(g).toFixed(2)}
        `;
      }
    },

    plotOptions: {
      series: {
        lowColor: "#F2C94C", // women
        color: "#2DD4BF",    // men
        connectorWidth: 3,
        marker: { radius: 6 }
      }
    },

    credits: { enabled: false },

    series: [{
      name: "Gizonak vs Emakumeak",
      data: seriesData
    }]
  });
}

async function loadInfo() {
  // Panelerako deskribapenak (estatikoak) kargatu
  const r = await fetch(INFO_PATH, { cache: "no-store" });

  // Fitxategia oraindik ez baduzu sortu, webak funtzionatzen jarrai dezan:
  if (!r.ok) {
    console.warn(`Kontuz: ezin izan da info JSONa kargatu (${r.status}). ${INFO_PATH}`);
    INFO = {};
    return;
  }

  INFO = await r.json();
}

async function init() {
  // 0) Info JSONa kargatu (badagoen kasuan)
  await loadInfo();

  // 1) CSV-a kargatu
  const resp = await fetch(CSV_PATH, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error(`Ezin izan da CSV-a kargatu (${resp.status}). Bidea egiaztatu: ${CSV_PATH}`);
  }
  const text = await resp.text();

  // 2) Parseatu
  const table = parseCSV(text);
  const header = table[0].map(h => h.trim());
  const idx = (name) => header.indexOf(name);

  // CSV-aren header-ak (euskarazko script-aren arabera)
  const iEremua = idx("eremua");
  const iAdierazlea = idx("adierazlea");
  const iWomen = idx("women");
  const iMen = idx("men");
  const iArrakala = idx("arrakala");

  if ([iEremua, iAdierazlea, iWomen, iMen].some(i => i === -1)) {
    console.error("Header-a ez dator bat. Aurkitutakoa:", header);
    throw new Error("CSV header-ak ez dira espero bezala. Begiratu: eremua, adierazlea, women, men, arrakala");
  }

  ROWS = table.slice(1).map(r => ({
    eremua: (r[iEremua] ?? "").trim(),
    adierazlea: (r[iAdierazlea] ?? "").trim(),
    women: parseNumber(r[iWomen]),
    men: parseNumber(r[iMen]),
    arrakala: iArrakala === -1 ? null : parseNumber(r[iArrakala])
  }))
  .filter(r => r.eremua && r.adierazlea && r.women !== null && r.men !== null);

  const indicators = uniq(ROWS.map(r => r.adierazlea)).sort((a,b)=>a.localeCompare(b, "eu"));
  setOptions(elIndicator, indicators);

  // lehenengo adierazlea
  render(indicators[0]);

  elIndicator.addEventListener("change", () => render(elIndicator.value));
}

init().catch(err => {
  console.error(err);
  alert("Errorea: " + err.message);
});
