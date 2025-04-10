// layout/dictionary.js

var DictionaryManager = (function () {
  var dataDictionary = {};
  var lambdaEndpoint = "https://n6esvo2lgif4b5fvep6tkmcp3m0pvsoh.lambda-url.ap-south-1.on.aws/";

  function loadFromCloud() {
    fetch(lambdaEndpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to fetch tasks. HTTP status: " + response.status);
        }
        return response.json();
      })
      .then(json => {
        if (json && Object.keys(json).length > 0) {
          dataDictionary = json;
          updateDropdowns();
          updateDictionaryOutput();
          showTemporaryMessage("Tasks successfully loaded from S3.");
        } else {
          dataDictionary = {};
          updateDropdowns();
          updateDictionaryOutput();
          showTemporaryMessage("No tasks exist. Add some tasks.");
        }
      })
      .catch(error => {
        console.error("Error loading tasks:", error);
        showTemporaryMessage("Failed to load tasks from S3.");
      });
  }

  function saveToCloud() {
    // Convert dictionary to JSON
    var jsonData = JSON.stringify(dataDictionary);
    fetch(lambdaEndpoint + "?action=post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: jsonData
    })
      .then(response => response.text())
      .then(result => {
        console.log("Saved tasks to S3:", result);
      })
      .catch(error => {
        console.error("Error saving tasks to S3:", error);
      });
  }

  function deleteFromCloud(key) {
    fetch(lambdaEndpoint + "?key=" + encodeURIComponent(key), { method: "DELETE" })
      .then(response => response.text())
      .then(result => {
        console.log("Deleted task from S3:", result);
      })
      .catch(error => {
        console.error("Error deleting task from S3:", error);
      });
  }

  function pushData(key, valueStr) {
    if (!key || !valueStr) {
      showTemporaryMessage("ERROR: Key or Value cannot be empty.");
      return;
    }
    if (key === "TASKS") {
      showTemporaryMessage("ERROR: 'TASKS' is reserved. Please pick another key.");
      return;
    }
    var values = valueStr.split(",").map(v => v.trim()).filter(v => v);
    if (dataDictionary.hasOwnProperty(key)) {
      dataDictionary[key] = values;
      showTemporaryMessage("Task '" + key + "' updated successfully.");
    } else {
      if (Object.keys(dataDictionary).length >= 25) {
        showTemporaryMessage("ERROR: Dictionary is full. Cannot add more entries.");
        return;
      }
      dataDictionary[key] = values;
      showTemporaryMessage("Task '" + key + "' created successfully.");
    }
    updateDropdowns();
    updateDictionaryOutput();
    // Sync to AWS
    saveToCloud();
  }

  function deleteData(key) {
    if (!key) {
      showTemporaryMessage("ERROR: Invalid key.");
      return;
    }
    if (dataDictionary.hasOwnProperty(key)) {
      delete dataDictionary[key];
      updateDropdowns();
      updateDictionaryOutput();
      showTemporaryMessage("Task '" + key + "' deleted successfully.");
      // Sync deletion to AWS
      deleteFromCloud(key);
    } else {
      showTemporaryMessage("ERROR: Key '" + key + "' not found for deletion.");
    }
  }

  function searchData(key) {
    if (!key) {
      showTemporaryMessage("ERROR: Invalid or no key selected.");
      return "";
    }
    if (dataDictionary.hasOwnProperty(key)) {
      var values = dataDictionary[key].join(", ");
      showTemporaryMessage("Task '" + key + "' found. Values loaded.");
      return values;
    } else {
      showTemporaryMessage("ERROR: Key '" + key + "' not found.");
      return "";
    }
  }

  function updateDictionaryOutput() {
    var outputDiv = document.getElementById("dictionaryOutput");
    if (Object.keys(dataDictionary).length === 0) {
      outputDiv.innerHTML = "{}";
      return;
    }
    var out = "";
    for (var k in dataDictionary) {
      out += k + " : " + dataDictionary[k].join(", ") + "<br>";
    }
    outputDiv.innerHTML = out;
  }

  function updateDropdowns() {
    var taskDropdown = document.getElementById("taskDropdown");
    var commandDropdown = document.getElementById("commandDropdown");
    taskDropdown.innerHTML = '<option value="">Select Task</option>';
    commandDropdown.innerHTML = '<option value="">Select Task</option>';
    for (var k in dataDictionary) {
      var opt1 = document.createElement("option");
      opt1.value = k;
      opt1.text = k;
      taskDropdown.appendChild(opt1);

      var opt2 = document.createElement("option");
      opt2.value = k;
      opt2.text = k;
      commandDropdown.appendChild(opt2);
    }
  }

  function showTemporaryMessage(msg) {
    var outputDiv = document.getElementById("dictionaryOutput");
    outputDiv.innerHTML = msg;
    setTimeout(() => {
      updateDictionaryOutput();
    }, 2000);
  }

  return {
    loadFromCloud,
    pushData,
    deleteData,
    searchData,
    updateDropdowns,
    updateDictionaryOutput,
    getData: function () { return dataDictionary; }
  };
})();
