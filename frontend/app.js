const API = "https://ludo-inspire.onrender.com";

let token = localStorage.getItem("ludo_token");
let currentRoom = null;

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

async function register() {
  const msg = $("authMsg");
  msg.textContent = "Creating account...";

  try {
    const username = $("regUser").value.trim();
    const email = $("regEmail").value.trim();
    const password = $("regPass").value;

    if (!username || !email || !password) {
      throw new Error("Username, email aur password bhariye.");
    }

    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    token = data.token;
    localStorage.setItem("ludo_token", token);

    await showHome();

  } catch (error) {
    msg.textContent = error.message;
  }
}

async function login() {
  const msg = $("authMsg");
  msg.textContent = "Logging in...";

  try {
    const email = $("email").value.trim();
    const password = $("password").value;

    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    token = data.token;
    localStorage.setItem("ludo_token", token);

    await showHome();

  } catch (error) {
    msg.textContent = error.message;
  }
}

async function showHome() {
  try {
    await loadProfile();
    await loadRooms();
    await loadLeaderboard();

    $("auth").hidden = true;
    $("home").hidden = false;
    $("status").textContent = "Online";

  } catch (error) {
    logout();
    $("authMsg").textContent = error.message;
  }
}

async function loadProfile() {
  const data = await api("/api/me");
  const user = data.user;

  $("profile").innerHTML =
    `<b>${user.username}</b><br>
     🪙 ${user.coins} virtual coins<br>
     🏆 Wins: ${user.wins} · Losses: ${user.losses}`;
}

async function loadLeaderboard() {
  const data = await api("/api/leaderboard");

  $("leaderboard").innerHTML =
    data.leaderboard.slice(0, 10)
      .map((user, i) =>
        `${i + 1}. <b>${user.username}</b> — ${user.wins} wins · ${user.coins} coins`
      )
      .join("<br>") || "No players yet.";
}

async function loadRooms() {
  const data = await api("/api/rooms");

  $("rooms").innerHTML =
    data.rooms.map(room => `
      <div class="room">
        <b>${room.name}</b><br>
        <span>${room.playerCount}/${room.maxPlayers} players · ${room.status}</span>
        <br>
        <button onclick="joinRoom(${room.id})">Join</button>
      </div>
    `).join("") || "No rooms. Create one.";
}

async function createRoom() {
  try {
    const data = await api("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: "Ludo Room",
        maxPlayers: 4
      })
    });

    currentRoom = data.room;
    renderGame();

  } catch (error) {
    alert(error.message);
  }
}

async function joinRoom(id) {
  try {
    const data = await api("/api/rooms/" + id + "/join", {
      method: "POST"
    });

    currentRoom = data.room;
    renderGame();

  } catch (error) {
    alert(error.message);
  }
}

function renderGame() {
  if (!currentRoom) return;

  $("game").innerHTML = `
    <b>${currentRoom.name}</b>
    <p>${currentRoom.players.length}/${currentRoom.maxPlayers} players</p>

    <button onclick="startGame(${currentRoom.id})">Start</button>
    <button onclick="roll(${currentRoom.id})">🎲 Roll Dice</button>

    <div id="dice" class="dice">🎲</div>
  `;
}

async function startGame(id) {
  try {
    const data = await api("/api/rooms/" + id + "/start", {
      method: "POST"
    });

    currentRoom = data.room;
    renderGame();

  } catch (error) {
    alert(error.message);
  }
}

async function roll(id) {
  try {
    const data = await api("/api/rooms/" + id + "/dice", {
      method: "POST"
    });

    currentRoom = data.room;
    $("dice").textContent = "🎲 " + data.dice;

    await loadProfile();

  } catch (error) {
    alert(error.message);
  }
}

function logout() {
  token = null;
  currentRoom = null;

  localStorage.removeItem("ludo_token");

  $("home").hidden = true;
  $("auth").hidden = false;
  $("status").textContent = "Offline";
  $("authMsg").textContent = "";
}

if (token) {
  showHome();
} else {
  $("auth").hidden = false;
}
