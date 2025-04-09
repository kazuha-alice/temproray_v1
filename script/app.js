// script/app.js

document.addEventListener("DOMContentLoaded", function () {
  // 1) Load tasks from S3
  DictionaryManager.loadFromCloud();

  // 2) Bind Dictionary Manager events
  document.getElementById("pushButton").addEventListener("click", function () {
    var key = document.getElementById("keyInput").value.trim();
    var value = document.getElementById("valueInput").value.trim();
    DictionaryManager.pushData(key, value);
    document.getElementById("keyInput").value = "";
    document.getElementById("valueInput").value = "";
  });

  document.getElementById("deleteButton").addEventListener("click", function () {
    var key = document.getElementById("keyInput").value.trim();
    DictionaryManager.deleteData(key);
    document.getElementById("keyInput").value = "";
    document.getElementById("valueInput").value = "";
  });

  document.getElementById("searchButton").addEventListener("click", function () {
    var key = document.getElementById("keyInput").value.trim();
    var result = DictionaryManager.searchData(key);
    document.getElementById("valueInput").value = result;
  });

  // Refresh tasks from S3
  document.getElementById("refreshButton").addEventListener("click", function () {
    DictionaryManager.loadFromCloud();
  });

  // 3) Bind Command Center Run event
  document.getElementById("runButton").addEventListener("click", function () {
    var dropdown = document.getElementById("commandDropdown");
    var selectedKey = dropdown.value;
    if (!selectedKey) {
      document.getElementById("statusDisplay").innerHTML = "Invalid or no selection from dropdown.";
      return;
    }
    var data = DictionaryManager.getData();
    if (!data[selectedKey] || data[selectedKey].length === 0) {
      document.getElementById("statusDisplay").innerHTML = "No values found for key: " + selectedKey;
      return;
    }
    CommandCenter.sendTask(selectedKey, data[selectedKey]);
  });

  // 4) Set up polling frequency control
  var pollingSelect = document.getElementById("pollingSelect");
  var pollingInterval = parseInt(pollingSelect.value, 10);
  var pollingTimer = setInterval(function () {
    CommandCenter.checkSystemStatuses();
  }, pollingInterval);

  pollingSelect.addEventListener("change", function () {
    clearInterval(pollingTimer);
    pollingInterval = parseInt(this.value, 10);
    pollingTimer = setInterval(function () {
      CommandCenter.checkSystemStatuses();
    }, pollingInterval);
  });

  // 5) Initialize Chart.js for network latency graph and logging
  window.App = {
    chart: null,
    logEntries: [],
    graphPaused: false,
    initGraph: function (latencyData) {
      var ctx = document.getElementById("latencyChart").getContext("2d");
      this.chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: latencyData.map(e => e.time),
          datasets: [
            {
              label: "Network Latency (ms)",
              data: latencyData.map(e => e.latency),
              fill: false,
              borderColor: "rgba(75, 192, 192, 1)",
              tension: 0.1
            }
          ]
        },
        options: {
          scales: {
            x: { title: { display: true, text: "Time" } },
            y: { title: { display: true, text: "Latency (ms)" } }
          },
          plugins: {
            legend: { display: true }
          }
        }
      });
    },
    updateGraph: function (latencyData) {
      if (!this.chart || this.graphPaused) return;

      // Limit the graph to the last 30 data points
      const MAX_POINTS = 30;
      if (latencyData.length > MAX_POINTS) {
        latencyData.splice(0, latencyData.length - MAX_POINTS);
      }

      this.chart.data.labels = latencyData.map(e => e.time);
      this.chart.data.datasets[0].data = latencyData.map(e => e.latency);
      this.chart.update();
    },
    // Save log entries and trigger a download of a JSON file (this is now called per task run)
    saveLog: function (logEntry) {
      this.logEntries.push(logEntry);
      var now = new Date();
      var filename =
        ("0" + now.getDate()).slice(-2) +
        ("0" + (now.getMonth() + 1)).slice(-2) +
        now.getFullYear() +
        ("0" + now.getHours()).slice(-2) +
        ("0" + now.getMinutes()).slice(-2) +
        ("0" + now.getSeconds()).slice(-2) +
        ".json";
      var blob = new Blob([JSON.stringify(this.logEntries, null, 2)], { type: "application/json" });
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    },
    pauseGraph: function () {
      this.graphPaused = true;
    },
    resumeGraph: function () {
      this.graphPaused = false;
      this.updateGraph([]);
    }
  };

  // Initialize the empty network latency graph with a placeholder point
  App.initGraph([{ time: new Date().toLocaleTimeString(), latency: 0 }]);

  // 6) Dark mode toggle
  document.getElementById("modeToggle").addEventListener("change", function () {
    document.body.classList.toggle("dark-mode", this.checked);
  });

  // 7) Graph control buttons
  document.getElementById("pauseGraphButton").addEventListener("click", function () {
    App.graphPaused = !App.graphPaused;
    this.innerHTML = App.graphPaused
      ? '<i class="material-icons">play_arrow</i> Resume Graph'
      : '<i class="material-icons">pause</i> Pause Graph';
  });

  document.getElementById("exportGraphButton").addEventListener("click", function () {
    if (!App.chart) return;
    var link = document.createElement('a');
    link.href = App.chart.toBase64Image();
    link.download = 'latency-graph.png';
    link.click();
  });

  // 8) Additional UI events for polling and logs
  document.getElementById("togglePollingButton").addEventListener("click", function () {
    CommandCenter.togglePolling();
  });

  document.getElementById("clearLogsButton").addEventListener("click", function () {
    App.logEntries = [];
    CommandCenter.clearLatencyStats();
  });
});
