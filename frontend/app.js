const API = "https://ludo-inspire.onrender.com";

let token = localStorage.getItem("ludo_token");
let currentRoom = null;
let roomTimer = null;

const $ = id => document.getElementById(id);

async function api(path, options = {}) {

  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json"
  };

  if (token) {
    options.headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(API + path, options);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}


/* LOGIN */

async function loginUser() {

  const msg = $("loginMsg");

  try {

    msg.textContent = "Logging in...";

    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("loginEmail").value.trim(),
        password: $("loginPassword").value
      })
    });

    token = data.token;

    localStorage.setItem("ludo_token", token);

    window.location.href = "index.html";

  } catch (error) {

    msg.textContent = error.message;

  }
}


/* REGISTER */

async function registerUser() {

  const msg = $("registerMsg");

  try {

    msg.textContent = "Creating account...";

    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: $("regUsername").value.trim(),
        email: $("regEmail").value.trim(),
        password: $("regPassword").value
      })
    });

    token = data.token;

    localStorage.setItem("ludo_token", token);

    window.location.href = "index.html";

  } catch (error) {

    msg.textContent = error.message;

  }
}


/* LOGOUT */

function logoutUser() {

  token = null;

  localStorage.removeItem("ludo_token");

  window.location.href = "login.html";
}


/* PROFILE */

async function loadProfilePage() {

  const box = $("profileData");

  if (!box) return;

  if (!token) {

    box.innerHTML = `
      <p>Please login first.</p>
      <a href="login.html" class="gold-btn">LOGIN</a>
    `;

    return;
  }

  try {

    const data = await api("/api/me");

    const u = data.user;

    box.innerHTML = `
      <div class="profile-line">
        <b>Username</b><br>
        ${u.username}
      </div>

      <div class="profile-line">
        <b>Email</b><br>
        ${u.email}
      </div>

      <div class="profile-line">
        <b>🪙 Virtual Coins</b><br>
        ${u.coins}
      </div>

      <div class="profile-line">
        <b>🏆 Wins</b><br>
        ${u.wins}
      </div>

      <div class="profile-line">
        <b>❌ Losses</b><br>
        ${u.losses}
      </div>
    `;

  } catch (error) {

    box.innerHTML = `<p>${error.message}</p>`;

  }
}


/* ROOMS */

async function loadRooms() {

  const box = $("roomList");

  if (!box) return;

  if (!token) {

    box.innerHTML = `
      <div class="list-item">
        <div>Please login to play.</div>
        <a href="login.html" class="gold-btn">LOGIN</a>
      </div>
    `;

    return;
  }

  try {

    const data = await api("/api/rooms");

    if (!data.rooms.length) {

      box.innerHTML = `
        <div class="list-item">
          No rooms available. Create a new room.
        </div>
      `;

      return;
    }

    box.innerHTML = data.rooms.map(room => `

      <div class="list-item">

        <div>
          <b>${escapeHtml(room.name)}</b>
          <br>
          <span class="muted">
            ${room.playerCount}/${room.maxPlayers}
            players · ${room.status}
          </span>
        </div>

        ${
          room.status === "waiting"
          ?
          `<button class="gold-btn"
             onclick="joinGameRoom(${room.id})">
             JOIN
           </button>`
          :
          `<button class="dark-btn"
             onclick="openGameRoom(${room.id})">
             VIEW
           </button>`
        }

      </div>

    `).join("");

  } catch (error) {

    box.innerHTML = `<div class="list-item">${error.message}</div>`;

  }
}


/* CREATE ROOM */

async function createGameRoom() {

  if (!token) {

    window.location.href = "login.html";

    return;
  }

  try {

    const data = await api("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: "Ludo Room",
        maxPlayers: 4
      })
    });

    currentRoom = data.room;

    showGameArea();

    startRoomPolling();

  } catch (error) {

    alert(error.message);

  }
}


/* JOIN ROOM */

async function joinGameRoom(id) {

  try {

    const data = await api("/api/rooms/" + id + "/join", {
      method: "POST"
    });

    currentRoom = data.room;

    showGameArea();

    startRoomPolling();

  } catch (error) {

    alert(error.message);

  }
}


/* OPEN ROOM */

async function openGameRoom(id) {

  try {

    const data = await api("/api/rooms/" + id);

    currentRoom = data.room;

    showGameArea();

    startRoomPolling();

  } catch (error) {

    alert(error.message);

  }
}


/* GAME AREA */

function showGameArea() {

  const area = $("gameArea");

  if (!area) return;

  area.hidden = false;

  window.scrollTo({
    top: area.offsetTop,
    behavior: "smooth"
  });

  renderRoom();

}


/* START GAME */

async function startCurrentGame() {

  if (!currentRoom) return;

  try {

    const data = await api(
      "/api/rooms/" + currentRoom.id + "/start",
      {
        method: "POST"
      }
    );

    currentRoom = data.room;

    renderRoom();

  } catch (error) {

    alert(error.message);

  }

}


/* ROLL DICE */

async function rollCurrentDice() {

  if (!currentRoom) return;

  try {

    const data = await api(
      "/api/rooms/" + currentRoom.id + "/dice",
      {
        method: "POST"
      }
    );

    currentRoom = data.room;

    renderRoom();

  } catch (error) {

    alert(error.message);

  }

}


/* ROOM POLLING */

function startRoomPolling() {

  if (roomTimer) {

    clearInterval(roomTimer);

  }

  roomTimer = setInterval(async () => {

    if (!currentRoom) return;

    try {

      const data = await api(
        "/api/rooms/" + currentRoom.id
      );

      currentRoom = data.room;

      renderRoom();

    } catch (error) {

      console.log(error.message);

    }

  }, 1500);

}


/* RENDER ROOM */

function renderRoom() {

  if (!currentRoom) return;

  if ($("roomName")) {

    $("roomName").textContent =
      currentRoom.name;

  }

  if ($("roomPlayers")) {

    $("roomPlayers").textContent =
      "Players: " + currentRoom.players.length +
      "/" + currentRoom.maxPlayers;

  }

  if ($("gamePlayers")) {

    $("gamePlayers").innerHTML =
      currentRoom.players.map((p, index) => {

        const active =
          currentRoom.currentTurn === p.id;

        return `
          <div class="player-row">
            ${index + 1}. <b>${escapeHtml(p.username)}</b>
            ${active ? " 🎲 YOUR TURN" : ""}
          </div>
        `;

      }).join("");

  }

  if ($("diceValue")) {

    $("diceValue").textContent =
      currentRoom.diceValue
      ? "🎲 " + currentRoom.diceValue
      : "🎲";

  }

  if ($("turnText")) {

    if (currentRoom.status === "waiting") {

      $("turnText").textContent =
        "Waiting for players...";

    } else {

      const player =
        currentRoom.players.find(
          p => p.id === currentRoom.currentTurn
        );

      $("turnText").textContent =
        player
        ? player.username + "'s turn"
        : "Waiting...";

    }

  }

  if ($("startBtn")) {

    $("startBtn").style.display =
      currentRoom.status === "waiting"
      ? "inline-block"
      : "none";

  }

  if ($("rollBtn")) {

    const myId =
      getCurrentUserId();

    $("rollBtn").disabled =
      currentRoom.status !== "playing" ||
      currentRoom.currentTurn !== myId;

  }

}


/* GET CURRENT USER ID FROM JWT */

function getCurrentUserId() {

  if (!token) return null;

  try {

    const payload =
      JSON.parse(
        atob(
          token.split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
        )
      );

    return Number(payload.id);

  } catch {

    return null;

  }

}


/* TOURNAMENTS */

async function loadTournaments() {

  const box = $("tournamentList");

  if (!box) return;

  if (!token) {

    box.innerHTML = `
      <div class="list-item">
        Login to see tournaments.
        <a href="login.html" class="gold-btn">LOGIN</a>
      </div>
    `;

    return;
  }

  try {

    const data = await api("/api/tournaments");

    if (!data.tournaments.length) {

      box.innerHTML =
        `<div class="list-item">No tournaments available.</div>`;

      return;

    }

    box.innerHTML =
      data.tournaments.map(t => `

        <div class="list-item">

          <div>
            <b>${escapeHtml(t.name)}</b>
            <br>
            <span class="muted">
              ${t.playerCount}/${t.max_players} players
              · ${t.status}
            </span>
          </div>

          <button class="gold-btn"
            onclick="joinTournament(${t.id})">
            JOIN
          </button>

        </div>

      `).join("");

  } catch (error) {

    box.innerHTML =
      `<div class="list-item">${error.message}</div>`;

  }

}


/* JOIN TOURNAMENT */

async function joinTournament(id) {

  try {

    await api("/api/tournaments/" + id + "/join", {
      method: "POST"
    });

    alert("Tournament joined!");

    loadTournaments();

  } catch (error) {

    alert(error.message);

  }

}


/* LEADERBOARD */

async function loadLeaderboard() {

  const box = $("leaderboardList");

  if (!box) return;

  if (!token) {

    box.innerHTML = `
      <div class="list-item">
        Login to view leaderboard.
        <a href="login.html" class="gold-btn">LOGIN</a>
      </div>
    `;

    return;

  }

  try {

    const data = await api("/api/leaderboard");

    box.innerHTML =
      data.leaderboard.map((u, index) => `

        <div class="rank-row">

          <b>#${index + 1}</b>

          <div>
            <b>${escapeHtml(u.username)}</b>
            <br>
            <span class="muted">
              ${u.wins} wins · ${u.losses} losses
            </span>
          </div>

          <b>🪙 ${u.coins}</b>

        </div>

      `).join("");

  } catch (error) {

    box.innerHTML =
      `<div class="list-item">${error.message}</div>`;

  }

}


/* SECURITY */

function escapeHtml(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}
