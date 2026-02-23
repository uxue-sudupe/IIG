
const CSV_PATH = "./data/dumbbell_2025.csv";

const elIndicator = document.getElementById("adierazleSelect");

let ROWS = []; // CSV lerro guztiak hemen

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

function parseNumber(x) {
  // CSV-an baliteke hutsik egotea edo koma/puntua…
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  if (!s) return null;
  // balizko koma decimalak -> puntura
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function render(indicator) {
  const data = ROWS.filter(r => r.adierazlea === indicator);

  // Herrialde/eremuak X ardatzean
  const categories = data.map(r => r.eremua);

  // Dumbbell seriea: low = women, high = men
  const seriesData = data.map(r => ({
    name: r.eremua,
    low: r.women,
    high: r.men,
    women: r.women,
    men: r.men,
    gap: r.arrakala
  }));

  Highcharts.chart("container", {
    chart: {
      type: "dumbbell",
      inverted: false
    },
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
        return `
          <b>${this.name}</b><br/>
          Emakumeak: ${this.women}<br/>
          Gizonak: ${this.men}<br/>
          Arrakala (G - E): ${Number(this.gap).toFixed(2)}
        `;
      }
    },

    plotOptions: {
      series: {
        // koloreak (aukerakoa): Women (low) eta Men (high)
        lowColor: "#F2C94C",
        color: "#2DD4BF",
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

function init() {
  Highcharts.data({
    csvURL: CSV_PATH,
    enablePolling: false,
    complete: function (options) {
      // options.dataCols -> zutabeak; baina errazago: options.dataRows erabiltzea
      // Highcharts Data modulua:
      // options.dataRows[0] = header
      // options.dataRows[n] = row

      const rows = options.dataRows;
      const header = rows[0];

      // Espero dugun header-a: urtea,eremua,adierazlea,women,men,arrakala
      const idx = (name) => header.indexOf(name);

      const iUrtea = idx("urtea");
      const iEremua = idx("eremua");
      const iAdierazlea = idx("adierazlea");
      const iWomen = idx("women");
      const iMen = idx("men");
      const iArrakala = idx("arrakala");

      if ([iUrtea, iEremua, iAdierazlea, iWomen, iMen, iArrakala].some(i => i === -1)) {
        console.error("Header-a ez dator bat. CSV header-a begiratu:", header);
        alert("CSV header-a ez dator bat esperotakoarekin. Kontsola begiratu mesedez.");
        return;
      }

      ROWS = rows.slice(1).map(r => ({
        urtea: r[iUrtea],
        eremua: r[iEremua],
        adierazlea: r[iAdierazlea],
        women: parseNumber(r[iWomen]),
        men: parseNumber(r[iMen]),
        arrakala: parseNumber(r[iArrakala])
      }))
      // segurtasunagatik: nullak kanpo
      .filter(r => r.women !== null && r.men !== null);

      const indicators = uniq(ROWS.map(r => r.adierazlea)).sort((a,b)=>a.localeCompare(b, "eu"));
      setOptions(elIndicator, indicators);

      // lehenengo adierazlea marraztu
      render(indicators[0]);

      elIndicator.addEventListener("change", () => render(elIndicator.value));
    }
  });
}

init();
