const API = "https://ludo-inspire.onrender.com";

let token = localStorage.getItem("ludo_token");
let currentRoomId = null;
let pollTimer = null;
let lastRoom = null;

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

/* =========================
   AUTH
========================= */

function showLogin() {
  if (!$("loginForm")) return;

  $("loginForm").hidden = false;
  $("registerForm").hidden = true;

  $("loginTab")?.classList.add("active");
  $("registerTab")?.classList.remove("active");
}

function showRegister() {
  if (!$("loginForm")) return;

  $("loginForm").hidden = true;
  $("registerForm").hidden = false;

  $("loginTab")?.classList.remove("active");
  $("registerTab")?.classList.add("active");
}

async function register() {
  const username = $("regUser")?.value.trim();
  const email = $("regEmail")?.value.trim();
  const password = $("regPass")?.value;

  if (!username || !email || !password) {
    $("authMsg").textContent = "Please fill all fields.";
    return;
  }

  $("authMsg").textContent = "Creating account...";

  try {
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

    $("authMsg").textContent = "";

    showHomePage();

  } catch (error) {
    $("authMsg").textContent = error.message;
  }
}

async function login() {
  const email = $("email")?.value.trim();
  const password = $("password")?.value;

  if (!email || !password) {
    $("authMsg").textContent = "Enter email and password.";
    return;
  }

  $("authMsg").textContent = "Signing in...";

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    token = data.token;
    localStorage.setItem("ludo_token", token);

    $("authMsg").textContent = "";

    showHomePage();

  } catch (error) {
    $("authMsg").textContent = error.message;
  }
}

/* =========================
   PROFILE
========================= */

async function loadProfile() {
  if (!token) {
    showAuth();
    return;
  }

  try {
    const data = await api("/api/me");
    const user = data.user;

    if ($("profileName"))
      $("profileName").textContent = user.username || "Player";

    if ($("profileEmail"))
      $("profileEmail").textContent = user.email || "";

    if ($("coinTop"))
      $("coinTop").textContent = user.coins ?? 0;

    if ($("cashWon"))
      $("cashWon").textContent = user.coins ?? 0;

    const battles =
      (user.wins || 0) +
      (user.losses || 0);

    if ($("battles"))
      $("battles").textContent = battles;

    if ($("referrals"))
      $("referrals").textContent = 0;

    if ($("walletCoins"))
      $("walletCoins").textContent = user.coins ?? 0;

  } catch (error) {
    console.log(error);

    if (
      error.message.includes("token") ||
      error.message.includes("bearer") ||
      error.message.includes("Invalid")
    ) {
      logout();
    }
  }
}

/* =========================
   PAGE NAVIGATION
========================= */

function showHomePage() {
  closeDrawer();

  if ($("homePage"))
    $("homePage").hidden = false;

  if ($("profilePage"))
    $("profilePage").hidden = true;

  if ($("auth"))
    $("auth").hidden = true;

  if ($("gamePage"))
    $("gamePage").hidden = true;

  stopRoomPolling();
}

function showProfilePage() {
  closeDrawer();

  if (!token) {
    showAuth();
    return;
  }

  if ($("homePage"))
    $("homePage").hidden = true;

  if ($("profilePage"))
    $("profilePage").hidden = false;

  if ($("auth"))
    $("auth").hidden = true;

  if ($("gamePage"))
    $("gamePage").hidden = true;

  hideBoxes();
  loadProfile();
}

function showAuth() {
  if ($("homePage"))
    $("homePage").hidden = true;

  if ($("profilePage"))
    $("profilePage").hidden = true;

  if ($("gamePage"))
    $("gamePage").hidden = true;

  if ($("auth"))
    $("auth").hidden = false;

  showLogin();
}

/* =========================
   DRAWER
========================= */

function toggleDrawer() {
  $("drawer")?.classList.toggle("open");
  $("overlay")?.classList.toggle("show");
}

function closeDrawer() {
  $("drawer")?.classList.remove("open");
  $("overlay")?.classList.remove("show");
}

/* =========================
   PROFILE BOXES
========================= */

function hideBoxes() {
  if ($("historyBox"))
    $("historyBox").hidden = true;

  if ($("walletBox"))
    $("walletBox").hidden = true;

  if ($("referralBox"))
    $("referralBox").hidden = true;
}

async function openWallet() {
  closeDrawer();

  showProfilePage();

  hideBoxes();

  if ($("walletBox")) {
    $("walletBox").hidden = false;
    await loadProfile();

    $("walletBox").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
}

function openReferral() {
  closeDrawer();

  showProfilePage();

  hideBoxes();

  if ($("referralBox")) {
    $("referralBox").hidden = false;

    $("referralBox").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
}

async function showHistory() {
  closeDrawer();

  showProfilePage();

  hideBoxes();

  const box = $("historyBox");

  if (!box) return;

  box.hidden = false;
  box.innerHTML = "Loading history...";

  try {
    const data = await api("/api/games/history");

    if (!data.games || data.games.length === 0) {
      box.innerHTML = `
        <b>Game History</b>
        <p>No games played yet.</p>
      `;
      return;
    }

    box.innerHTML =
      "<b>Game History</b>" +
      data.games.map(game => `
        <div class="rank">
          <span>Game #${game.id}</span>
          <span>${game.result || "Played"}</span>
        </div>
      `).join("");

  } catch {
    box.innerHTML = `
      <b>History</b>
      <p>Unable to load history.</p>
    `;
  }
}

function copyReferral() {
  const code =
    $("refCode")?.textContent.trim() || "";

  if (navigator.clipboard) {
    navigator.clipboard.writeText(code);
  }

  alert("Referral code copied");
}

function completeProfile() {
  alert("Profile details section coming soon.");
}

/* =========================
   LOGOUT
========================= */

function logout() {
  stopRoomPolling();

  token = null;
  currentRoomId = null;
  lastRoom = null;

  localStorage.removeItem("ludo_token");

  showAuth();
}

/* =====================================================
   2 PLAYER LUDO
===================================================== */

/*
  Play button ko is function se connect karein:
  onclick="openLudo()"
*/

async function openLudo() {
  if (!token) {
    showAuth();
    return;
  }

  if ($("homePage"))
    $("homePage").hidden = true;

  if ($("profilePage"))
    $("profilePage").hidden = true;

  if ($("auth"))
    $("auth").hidden = true;

  createGameUI();

  await loadRooms();
}

/* =========================
   GAME UI
========================= */

function createGameUI() {
  let page = $("gamePage");

  if (page) {
    page.hidden = false;
    return;
  }

  page = document.createElement("section");

  page.id = "gamePage";

  page.style.cssText = `
    position:fixed;
    inset:0;
    z-index:1000;
    background:#18070b;
    color:#fff;
    overflow:auto;
    padding:18px;
    font-family:Arial,sans-serif;
  `;

  page.innerHTML = `
    <div style="
      max-width:520px;
      margin:auto;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:18px;
      ">

        <button
          onclick="closeLudo()"
          style="
            border:0;
            border-radius:12px;
            padding:10px 14px;
            background:#4b1720;
            color:#fff;
            font-weight:bold;
          "
        >
          ← Back
        </button>

        <h2 style="
          margin:0;
          color:#f5c86b;
        ">
          Ludo Inspire
        </h2>

        <div style="
          width:55px;
        "></div>

      </div>

      <div id="roomArea"></div>

      <div id="boardArea"></div>

    </div>
  `;

  document.body.appendChild(page);
}

function closeLudo() {
  stopRoomPolling();

  if ($("gamePage"))
    $("gamePage").hidden = true;

  showHomePage();
}

/* =========================
   LOAD ROOMS
========================= */

async function loadRooms() {
  const area = $("roomArea");

  if (!area) return;

  area.innerHTML = `
    <div style="
      background:#2b0e14;
      border-radius:18px;
      padding:20px;
      margin-bottom:16px;
    ">

      <h3 style="
        margin-top:0;
        color:#f5c86b;
      ">
        2 Player Ludo
      </h3>

      <p style="color:#d9bfc4;">
        Play with one more player.
      </p>

      <button
        onclick="createRoom()"
        style="
          width:100%;
          padding:14px;
          border:0;
          border-radius:12px;
          background:#dcae45;
          color:#26090e;
          font-weight:bold;
          font-size:16px;
        "
      >
        🎮 Create Room
      </button>

    </div>

    <div style="
      background:#2b0e14;
      border-radius:18px;
      padding:20px;
    ">

      <h3 style="
        margin-top:0;
        color:#f5c86b;
      ">
        Available Rooms
      </h3>

      <div id="roomsList">
        Loading rooms...
      </div>

    </div>
  `;

  try {
    const data = await api("/api/rooms");

    const list = $("roomsList");

    if (!list) return;

    if (!data.rooms || data.rooms.length === 0) {
      list.innerHTML = `
        <p style="color:#d9bfc4;">
          No rooms available.
        </p>
      `;
      return;
    }

    list.innerHTML = data.rooms.map(room => `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        padding:12px;
        margin-bottom:10px;
        border:1px solid #57202a;
        border-radius:12px;
      ">

        <div>
          <b>${escapeHtml(room.name)}</b>
          <div style="
            color:#cfaeb4;
            font-size:13px;
            margin-top:4px;
          ">
            ${room.playerCount}/2 Players
          </div>
        </div>

        <button
          onclick="joinRoom(${room.id})"
          style="
            border:0;
            border-radius:10px;
            padding:9px 13px;
            background:#dcae45;
            color:#26090e;
            font-weight:bold;
          "
        >
          Join
        </button>

      </div>
    `).join("");

  } catch (error) {
    $("roomsList").innerHTML = `
      <p style="color:#ff9b9b;">
        ${escapeHtml(error.message)}
      </p>
    `;
  }
}

/* =========================
   CREATE ROOM
========================= */

async function createRoom() {
  try {
    const data = await api("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: "Jitesh's Room"
      })
    });

    currentRoomId = data.room.id;

    showRoom(data.room);

    startRoomPolling();

  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   JOIN ROOM
========================= */

async function joinRoom(roomId) {
  try {
    const data = await api(
      `/api/rooms/${roomId}/join`,
      {
        method: "POST"
      }
    );

    currentRoomId = roomId;

    showRoom(data.room);

    startRoomPolling();

  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   SHOW ROOM
========================= */

function showRoom(room) {
  lastRoom = room;

  const area = $("roomArea");

  if (!area) return;

  const players = room.players || [];

  area.innerHTML = `
    <div style="
      background:#2b0e14;
      border-radius:18px;
      padding:18px;
      margin-bottom:16px;
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">

        <div>
          <div style="
            color:#cfaeb4;
            font-size:13px;
          ">
            ROOM
          </div>

          <div style="
            font-size:22px;
            font-weight:bold;
            color:#f5c86b;
          ">
            #${room.id}
          </div>
        </div>

        <div style="
          background:#4b1720;
          border-radius:10px;
          padding:8px 12px;
        ">
          ${players.length}/2
        </div>

      </div>

      <div style="
        margin-top:15px;
      ">

        ${players.map(player => `
          <div style="
            display:flex;
            align-items:center;
            gap:10px;
            padding:9px;
            margin-top:7px;
            border-radius:10px;
            background:#3a131b;
          ">

            <span style="
              width:12px;
              height:12px;
              border-radius:50%;
              background:${
                player.color === "green"
                  ? "#39d353"
                  : "#ff4d5d"
              };
            "></span>

            <span>
              ${escapeHtml(player.username)}
            </span>

          </div>
        `).join("")}

      </div>

      ${
        room.status === "waiting" &&
        room.createdBy === getUserIdFromRoom(room)
          ? `
            <button
              onclick="startGame()"
              ${players.length !== 2 ? "disabled" : ""}
              style="
                width:100%;
                margin-top:16px;
                padding:14px;
                border:0;
                border-radius:12px;
                background:${
                  players.length === 2
                    ? "#dcae45"
                    : "#6d5559"
                };
                color:#26090e;
                font-weight:bold;
              "
            >
              ${
                players.length === 2
                  ? "▶ Start Game"
                  : "Waiting for Player 2..."
              }
            </button>
          `
          : ""
      }

      ${
        room.status === "waiting" &&
        room.createdBy !== getCurrentUserId()
          ? `
            <div style="
              margin-top:15px;
              text-align:center;
              color:#f5c86b;
            ">
              Waiting for room owner to start...
            </div>
          `
          : ""
      }

    </div>
  `;

  if (room.status === "playing") {
    renderBoard(room);
  } else if (room.status === "finished") {
    renderWinner(room);
  }
}

/* =========================
   START GAME
========================= */

async function startGame() {
  if (!currentRoomId) return;

  try {
    const data = await api(
      `/api/rooms/${currentRoomId}/start`,
      {
        method: "POST"
      }
    );

    showRoom(data.room);

  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   BOARD
========================= */

function renderBoard(room) {
  const area = $("boardArea");

  if (!area) return;

  const myId = getCurrentUserId();

  const myTurn =
    Number(room.currentTurn) === Number(myId);

  const dice =
    room.diceValue || "-";

  const state =
    room.gameState || {};

  const players =
    room.players || [];

  area.innerHTML = `
    <div style="
      background:#2b0e14;
      border-radius:18px;
      padding:18px;
      margin-bottom:20px;
    ">

      <div style="
        text-align:center;
        margin-bottom:14px;
      ">

        <div style="
          color:#cfaeb4;
          font-size:13px;
        ">
          ${
            myTurn
              ? "YOUR TURN"
              : "OPPONENT'S TURN"
          }
        </div>

        <div style="
          font-size:42px;
          margin:8px 0;
        ">
          🎲 ${dice}
        </div>

        ${
          myTurn
            ? `
              <button
                onclick="rollDice()"
                style="
                  padding:13px 25px;
                  border:0;
                  border-radius:12px;
                  background:#dcae45;
                  color:#26090e;
                  font-weight:bold;
                  font-size:16px;
                "
              >
                Roll Dice
              </button>
            `
            : `
              <div style="
                color:#cfaeb4;
              ">
                Please wait...
              </div>
            `
        }

      </div>

      <div id="ludoBoard">
        ${createBoard(room)}
      </div>

    </div>
  `;

  renderTokens(room);
}

/* =========================
   BOARD DESIGN
========================= */

function createBoard(room) {
  return `
    <div style="
      width:min(92vw,430px);
      aspect-ratio:1;
      margin:auto;
      display:grid;
      grid-template-columns:repeat(3,1fr);
      grid-template-rows:repeat(3,1fr);
      gap:5px;
      background:#5b222b;
      padding:5px;
      border-radius:16px;
    ">

      <div style="
        background:#39d353;
        border-radius:12px;
        padding:10px;
      ">
        🟢
      </div>

      <div style="
        background:#f1d6a4;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:28px;
      ">
        ⬆️
      </div>

      <div style="
        background:#ff4d5d;
        border-radius:12px;
        padding:10px;
        text-align:right;
      ">
        🔴
      </div>

      <div style="
        background:#f1d6a4;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:28px;
      ">
        ⬅️
      </div>

      <div style="
        background:#dcae45;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:34px;
      ">
        🎯
      </div>

      <div style="
        background:#f1d6a4;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:28px;
      ">
        ➡️
      </div>

      <div style="
        background:#f1d6a4;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:28px;
      ">
        ⬇️
      </div>

      <div style="
        background:#f1d6a4;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:28px;
      ">
        🏠
      </div>

      <div style="
        background:#f1d6a4;
        border-radius:12px;
        padding:10px;
        text-align:right;
      ">
        🏠
      </div>

    </div>
  `;
}

/* =========================
   TOKENS
========================= */

function renderTokens(room) {
  const area = $("ludoBoard");

  if (!area) return;

  const state =
    room.gameState || {};

  const players =
    room.players || [];

  let html = `
    <div style="
      margin-top:15px;
      display:grid;
      gap:10px;
    ">
  `;

  players.forEach(player => {
    const playerState =
      state.players?.[player.id];

    if (!playerState) return;

    html += `
      <div style="
        border-radius:14px;
        padding:12px;
        background:#3a131b;
      ">

        <div style="
          display:flex;
          justify-content:space-between;
          margin-bottom:8px;
        ">

          <b>
            ${escapeHtml(player.username)}
          </b>

          <span style="
            color:${
              player.color === "green"
                ? "#39d353"
                : "#ff4d5d"
            };
          ">
            ${player.color}
          </span>

        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:7px;
        ">

          ${playerState.tokens.map(
            (position, index) => `
              <button
                ${
                  Number(player.id) ===
                    Number(getCurrentUserId()) &&
                  Number(room.currentTurn) ===
                    Number(getCurrentUserId()) &&
                  room.diceValue
                    ? `onclick="moveToken(${index})"`
                    : "disabled"
                }
                style="
                  padding:12px 5px;
                  border-radius:10px;
                  border:1px solid #6a3039;
                  background:${
                    player.color === "green"
                      ? "#194f28"
                      : "#671c27"
                  };
                  color:#fff;
                  font-weight:bold;
                "
              >
                ${index + 1}
                <small style="
                  display:block;
                  margin-top:4px;
                  color:#d9bfc4;
                ">
                  ${
                    position === -1
                      ? "HOME"
                      : position === 56
                        ? "DONE"
                        : position
                  }
                </small>
              </button>
            `
          ).join("")}

        </div>

      </div>
    `;
  });

  html += "</div>";

  area.insertAdjacentHTML(
    "beforeend",
    html
  );
}

/* =========================
   DICE
========================= */

async function rollDice() {
  if (!currentRoomId) return;

  try {
    const data = await api(
      `/api/rooms/${currentRoomId}/dice`,
      {
        method: "POST"
      }
    );

    showRoom(data.room);

  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   MOVE
========================= */

async function moveToken(index) {
  if (!currentRoomId) return;

  try {
    const data = await api(
      `/api/rooms/${currentRoomId}/move`,
      {
        method: "POST",
        body: JSON.stringify({
          tokenIndex: index
        })
      }
    );

    showRoom(data.room);

    if (data.winner) {
      alert("🎉 You won the game!");
    }

  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   LIVE SYNC
========================= */

function startRoomPolling() {
  stopRoomPolling();

  pollTimer = setInterval(
    refreshRoom,
    1000
  );

  refreshRoom();
}

function stopRoomPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function refreshRoom() {
  if (!currentRoomId) return;

  try {
    const data = await api(
      `/api/rooms/${currentRoomId}/state`
    );

    const room = data.room;

    lastRoom = room;

    showRoom(room);

  } catch (error) {
    console.log("Room sync:", error.message);
  }
}

/* =========================
   WINNER
========================= */

function renderWinner(room) {
  const area = $("boardArea");

  if (!area) return;

  const state =
    room.gameState || {};

  let winnerName = "Winner";

  for (const player of room.players || []) {
    const playerState =
      state.players?.[player.id];

    if (
      playerState &&
      playerState.finished >= 4
    ) {
      winnerName = player.username;
      break;
    }
  }

  area.innerHTML = `
    <div style="
      text-align:center;
      background:#2b0e14;
      border-radius:20px;
      padding:35px 20px;
    ">

      <div style="
        font-size:65px;
      ">
        🏆
      </div>

      <h2 style="
        color:#f5c86b;
      ">
        ${escapeHtml(winnerName)}
      </h2>

      <p style="
        color:#d9bfc4;
      ">
        Game Finished
      </p>

      <button
        onclick="openLudo()"
        style="
          padding:13px 25px;
          border:0;
          border-radius:12px;
          background:#dcae45;
          color:#26090e;
          font-weight:bold;
        "
      >
        Play Again
      </button>

    </div>
  `;
}

/* =========================
   HELPERS
========================= */

function getCurrentUserId() {
  try {
    const payload =
      JSON.parse(
        atob(
          token
            .split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/")
        )
      );

    return payload.id;
  } catch {
    return null;
  }
}

function getUserIdFromRoom(room) {
  return room.createdBy;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   INIT
========================= */

async function init() {
  if (!token) {
    showAuth();
    return;
  }

  try {
    await api("/api/me");
    showHomePage();
  } catch {
    logout();
  }
}

init();
