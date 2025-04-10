// layout/command.js

var CommandCenter = (function () {
  var totalLatency = 0;
  var latencyCount = 0;
  var latencyData = [];
  var pollingActive = true;
  var isSending = false;
  var isPollingRunning = false;  // Flag to prevent overlapping polling calls
  var statusDisplay = document.getElementById("statusDisplay");

  function sendTask(taskKey, values) {
    if (!taskKey || values.length === 0) {
      updateStatusDisplay("Invalid or no selection from dropdown.");
      return;
    }
    if (isSending) {
      updateStatusDisplay("Task send in progress. Please wait.");
      return;
    }
    isSending = true;
    var runButton = document.getElementById("runButton");
    runButton.disabled = true;

    // Create payload exactly as Unity: { "TASK 11": [ "RUN_R13", "RUN_R11" ] }
    const payload = { [taskKey]: values };
    const jsonData = JSON.stringify(payload);
    console.log("sendTask JSON payload:", jsonData);

    // Set startTime before fetch
    var startTime = performance.now();

    var postUrl = "https://vb75uok5bkd7glvhy2fam4p7gy0bxone.lambda-url.ap-south-1.on.aws/?action=post";
    fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonData
    })
      .then(response => response.text())
      .then(text => {
        const latency = performance.now() - startTime;
        updateLatency(latency);
        console.log("Lambda Response:", text);

        // Determine status
        const status = text.toLowerCase().includes("success") || text.toLowerCase().includes("assigned")
          ? "success"
          : "error";
        if (status === "success") {
          updateStatusDisplay("Task Assigned successfully");
        } else {
          updateStatusDisplay("Lambda responded: " + text);
        }

        // Log data only on task run (no auto-download during polling)
        logData({
          timestamp: Date.now(),
          taskName: taskKey,
          commands: values,
          latencyMs: latency,
          dataSizeBytes: new Blob([jsonData]).size,
          status: status,
          responseText: text
        });
      })
      .catch(err => {
        console.error("Error sending task:", err);
        updateStatusDisplay("Unable to assign TASK, check your connection.");
      })
      .finally(() => {
        runButton.disabled = false;
        isSending = false;
      });
  }

  function checkSystemStatuses() {
    if (!pollingActive) return;
    if (isPollingRunning) return;
    isPollingRunning = true;
    
    var systems = {
      R1: "https://3zn2ik4ebtpunfecfbzvydqeee0uyhhw.lambda-url.ap-south-1.on.aws/",
      R2: "https://onbasxb5gbqdjyow3smf3wuabi0bykpe.lambda-url.ap-south-1.on.aws/",
      AMR: "https://pqkidjjudx65drhyoqdddxeeya0lziya.lambda-url.ap-south-1.on.aws/",
      CNC: "https://gvlgxpho5e74vnwhgx2l4k2kza0qqbdl.lambda-url.ap-south-1.on.aws/"
    };
    var systemStatuses = {};

    // Use Promise.allSettled to catch all errors without rejecting the promise
    var promises = Object.keys(systems).map(sysKey => {
      var startTime = performance.now();
      return fetch(systems[sysKey])
        .then(r => r.text())
        .then(text => {
          var lat = performance.now() - startTime;
          updateLatency(lat);
          var match = text.match(/"message"\s*:\s*"(\d+)/);
          var code = match ? match[1] : "";
          if (code === "1") systemStatuses[sysKey] = "free";
          else if (code === "0") systemStatuses[sysKey] = "busy";
          else if (code === "00") systemStatuses[sysKey] = "emergency";
          else systemStatuses[sysKey] = "error";
        })
        .catch(() => {
          systemStatuses[sysKey] = "offline";
        });
    });

    var latencyUrls = [
      "https://downv7qdlr6plpgi4fxja32tyu0lrszn.lambda-url.ap-south-1.on.aws/",
      "https://c3k4yolvbj7rkpoxtyswjm4uwa0qable.lambda-url.ap-south-1.on.aws/",
      "https://butzgl4libtxtvnj7ubezz3zdq0uayvg.lambda-url.ap-south-1.on.aws/"
    ];
    latencyUrls.forEach(url => {
      var startTime = performance.now();
      fetch(url)
        .then(() => {
          var lat = performance.now() - startTime;
          updateLatency(lat);
        })
        .catch(() => {});
    });

    Promise.allSettled(promises).then(() => {
      var out = "";
      Object.keys(systemStatuses).forEach(k => {
        var badgeClass = "status-badge ";
        switch (systemStatuses[k]) {
          case "free":
            badgeClass += "status-free";
            break;
          case "busy":
            badgeClass += "status-busy";
            break;
          case "emergency":
            badgeClass += "status-emergency";
            break;
          case "offline":
          case "error":
          default:
            badgeClass += "status-error";
            break;
        }
        out += k + " : <span class='" + badgeClass + "'>" + systemStatuses[k] + "</span><br>";
      });
      out += "+-----------------+<br>";
      out += "Latency: " + (latencyCount > 0 ? (totalLatency / latencyCount).toFixed(1) + " ms" : "N/A");
      updateStatusDisplay(out);
      isPollingRunning = false;  // Reset flag when done
    }).catch(() => {
      isPollingRunning = false;
    });
  }

  function updateLatency(lat) {
    totalLatency += lat;
    latencyCount++;
    latencyData.push({ time: new Date().toLocaleTimeString(), latency: lat });
    if (window.App && typeof window.App.updateGraph === "function") {
      window.App.updateGraph(latencyData);
    }
  }

  function updateStatusDisplay(msg) {
    statusDisplay.innerHTML = msg;
  }

  // logData() is used only in sendTask() – no polling download
  function logData(entry) {
    const filename = Date.now() + ".json";
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  function togglePolling() {
    pollingActive = !pollingActive;
    var btn = document.getElementById("togglePollingButton");
    if (pollingActive) {
      btn.innerHTML = '<i class="material-icons">pause</i> Stop Polling';
    } else {
      btn.innerHTML = '<i class="material-icons">play_arrow</i> Start Polling';
      updateStatusDisplay("Polling is paused.");
    }
  }

  function clearLatencyStats() {
    totalLatency = 0;
    latencyCount = 0;
    latencyData = [];
    updateStatusDisplay("Logs cleared. Ready for new calls.");
    if (window.App && typeof window.App.updateGraph === "function") {
      window.App.updateGraph(latencyData);
    }
  }

  return {
    sendTask,
    checkSystemStatuses,
    togglePolling,
    clearLatencyStats,
    updateLatency
  };
})();
