// ================================
// TEAM MANAGEMENT
// ================================

async function loadTeams() {

    try {
  
      const res = await fetch("/api/teams");
      const teams = await res.json();
  
      const body =
        document.getElementById("teamsBody");
  
      body.innerHTML = "";
  
      teams.forEach(team => {
  
        body.innerHTML += `
          <tr>
  
            <td>${team.teamNumber}</td>
  
            <td>${team.name}</td>
  
            <td>
              ${team.checkedIn ? "✅" : "❌"}
            </td>
  
            <td>
  
              <button
                class="primary"
                onclick="editTeam(
                  '${team.id}',
                  '${team.teamNumber}',
                  '${team.name}',
                  ${team.checkedIn}
                )"
              >
                Edit
              </button>
  
              <button
                class="success"
                onclick="toggleCheckIn('${team.id}')"
              >
                Check-In
              </button>
  
              <button
                class="danger"
                onclick="deleteTeam('${team.id}')"
              >
                Delete
              </button>
  
            </td>
  
          </tr>
        `;
      });
  
    } catch (err) {
  
      console.error(err);
      alert("Failed to load teams");
  
    }
  }
  
  async function addTeam() {
  
    const teamNumber =
      document.getElementById("teamNumber").value.trim();
  
    const name =
      document.getElementById("teamName").value.trim();
  
    if (!teamNumber || !name) {
  
      alert("Please enter a team number and name.");
      return;
  
    }
  
    try {
  
      await fetch("/api/teams", {
  
        method: "POST",
  
        headers: {
          "Content-Type": "application/json"
        },
  
        body: JSON.stringify({
          teamNumber,
          name
        })
  
      });
  
      document.getElementById("teamNumber").value = "";
      document.getElementById("teamName").value = "";
  
      loadTeams();
  
    } catch (err) {
  
      console.error(err);
      alert("Failed to add team");
  
    }
  }
  
  async function deleteTeam(id) {
  
    const confirmed =
      confirm("Delete this team?");
  
    if (!confirmed) return;
  
    try {
  
      await fetch(`/api/teams/${id}`, {
        method: "DELETE"
      });
  
      loadTeams();
  
    } catch (err) {
  
      console.error(err);
      alert("Failed to delete team");
  
    }
  }
  
  async function editTeam(
    id,
    currentNumber,
    currentName,
    checkedIn
  ) {
  
    const teamNumber = prompt(
      "Team Number",
      currentNumber
    );
  
    if (teamNumber === null) return;
  
    const name = prompt(
      "Team Name",
      currentName
    );
  
    if (name === null) return;
  
    try {
  
      await fetch(`/api/teams/${id}`, {
  
        method: "PUT",
  
        headers: {
          "Content-Type": "application/json"
        },
  
        body: JSON.stringify({
  
          teamNumber,
          name,
          checkedIn
  
        })
  
      });
  
      loadTeams();
  
    } catch (err) {
  
      console.error(err);
      alert("Failed to edit team");
  
    }
  }
  
  async function toggleCheckIn(id) {
  
    try {
  
      await fetch(
        `/api/teams/${id}/checking`,
        {
          method: "PATCH"
        }
      );
  
      loadTeams();
  
    } catch (err) {
  
      console.error(err);
      alert("Failed to update check-in");
  
    }
  }
  
  // ================================
  // TOURNAMENT SETTINGS
  // ================================
  
  async function saveSettings() {
  
    try {
  
      await fetch("/api/settings", {
  
        method: "POST",
  
        headers: {
          "Content-Type": "application/json"
        },
  
        body: JSON.stringify({
  
          tournamentName:
            document.getElementById(
              "tournamentName"
            ).value,
  
          season:
            document.getElementById(
              "season"
            ).value,
  
          venue:
            document.getElementById(
              "venue"
            ).value,
  
          tableCount:
            document.getElementById(
              "tableCount"
            ).value,
  
          status:
            document.getElementById(
              "status"
            ).value
  
        })
  
      });
  
      alert("Settings Saved");
  
    } catch (err) {
  
      console.error(err);
      alert("Failed to save settings");
  
    }
  }
  
  async function loadSettings() {
  
    try {
  
      const res =
        await fetch("/api/settings");
  
      const settings =
        await res.json();
  
      document.getElementById(
        "tournamentName"
      ).value =
        settings.tournamentName || "";
  
      document.getElementById(
        "season"
      ).value =
        settings.season || "";
  
      document.getElementById(
        "venue"
      ).value =
        settings.venue || "";
  
      document.getElementById(
        "tableCount"
      ).value =
        settings.tableCount || "";
  
      document.getElementById(
        "status"
      ).value =
        settings.status || "setup";
  
    } catch (err) {
  
      console.error(err);
  
    }
  }
  
  async function setStatus(status) {
  
    document.getElementById("status").value =
      status;
  
    await saveSettings();
  }
  
  // ================================
  // CSV IMPORT
  // ================================
  
  async function importCSV() {
  
    const file =
      document.getElementById("csvFile").files[0];
  
    if (!file) {
  
      alert("Choose a CSV file first");
      return;
  
    }
  
    const text =
      await file.text();
  
    const rows =
      text.split("\n");
  
    rows.shift();
  
    for (const row of rows) {
  
      if (!row.trim()) continue;
  
      const [teamNumber, name] =
        row.split(",");
  
      await fetch("/api/teams", {
  
        method: "POST",
  
        headers: {
          "Content-Type": "application/json"
        },
  
        body: JSON.stringify({
  
          teamNumber:
            teamNumber.trim(),
  
          name:
            name.trim()
  
        })
  
      });
    }
  
    alert("Import complete");
  
    loadTeams();
  }
  
  // ================================
  // EXPORT TEAMS
  // ================================
  
  async function exportTeams() {
  
    const res =
      await fetch("/api/teams");
  
    const teams =
      await res.json();
  
    let csv =
      "teamNumber,name,checkedIn\n";
  
    teams.forEach(team => {
  
      csv +=
        `${team.teamNumber},${team.name},${team.checkedIn}\n`;
  
    });
  
    const blob =
      new Blob([csv], {
        type: "text/csv"
      });
  
    const url =
      URL.createObjectURL(blob);
  
    const a =
      document.createElement("a");
  
    a.href = url;
  
    a.download =
      "teams.csv";
  
    a.click();
  
    URL.revokeObjectURL(url);
  }
  
  // ================================
  // DANGER ZONE
  // ================================
  
  async function resetScores() {
  
    const confirmed =
      confirm(
        "Delete ALL run scores?"
      );
  
    if (!confirmed) return;
  
    try {
  
      await fetch(
        "/api/runs/all",
        {
          method: "DELETE"
        }
      );
  
      alert("Scores reset");
  
    } catch (err) {
  
      console.error(err);
      alert("Failed to reset scores");
  
    }
  }
  
  async function deleteAllTeams() {
  
    const confirmed =
      confirm(
        "DELETE ALL TEAMS?"
      );
  
    if (!confirmed) return;
  
    try {
  
      await fetch(
        "/api/teams/all",
        {
          method: "DELETE"
        }
      );
  
      loadTeams();
  
      alert("Teams deleted");
  
    } catch (err) {
  
      console.error(err);
      alert("Failed to delete teams");
  
    }
  }
  
  // ================================
  // INITIAL LOAD
  // ================================
  
  loadSettings();
  loadTeams();