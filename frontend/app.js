/* =========================================================
   LUDO INSPIRE - APP.JS
   2 PLAYER LUDO
   ========================================================= */

const API_BASE = "https://ludo-inspire-api.onrender.com/api";
const TOKEN_KEY = "ludo_token";
const USER_KEY = "ludo_user";

let gamePollTimer = null;
let currentRoom = null;
let currentUser = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function saveUser(user) {
  currentUser = user || null;

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("ludo_room_id");

  if (gamePollTimer) {
    clearInterval(gamePollTimer);
    gamePollTimer = null;
  }

  window.location.href = "login.html";
}

window.logout = logout;


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function money(value) {
  const n = Number(value || 0);

  return n.toLocaleString("en-IN");
}


function getRoomId() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("room") ||
    localStorage.getItem("ludo_room_id") ||
    ""
  );
}


function saveRoomId(id) {
  if (id) {
    localStorage.setItem(
      "ludo_room_id",
      String(id)
    );
  }
}


function clearRoomId() {
  localStorage.removeItem("ludo_room_id");
}


function isLoggedIn() {
  return Boolean(token());
}


/* =========================================================
   API
   ========================================================= */

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const t = token();

  if (t) {
    headers.Authorization = `Bearer ${t}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers
      }
    );
  } catch (error) {
    throw new Error(
      "Server se connection nahi ho raha. Internet check karein."
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {

    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);

      if (
        !window.location.pathname.endsWith(
          "login.html"
        )
      ) {
        window.location.href = "login.html";
      }
    }

    throw new Error(
      data.error ||
      data.message ||
      `Request failed (${response.status})`
    );
  }

  return data;
}


/* =========================================================
   AUTH / USER
   ========================================================= */

async function loadCurrentUser() {
  if (!token()) {
    currentUser = getStoredUser();
    updateUserUI();
    return currentUser;
  }

  try {
    const data = await api("/me");

    if (data.user) {
      saveUser(data.user);
    }
  } catch (error) {
    currentUser = getStoredUser();
  }

  updateUserUI();

  return currentUser;
}


function updateUserUI() {
  const user = currentUser || getStoredUser();

  if (!user) return;

  const name =
    user.username ||
    user.name ||
    "Player";

  const email =
    user.email ||
    "";

  const nameElements = document.querySelectorAll(
    "[data-user-name], #profileName, #userName, .profile-name"
  );

  nameElements.forEach(el => {
    el.textContent = name;
  });

  const emailElements = document.querySelectorAll(
    "[data-user-email], #profileEmail, #userEmail, .profile-email"
  );

  emailElements.forEach(el => {
    el.textContent = email;
  });

  const coinElements = document.querySelectorAll(
    "[data-user-coins], #walletCoins, #coins"
  );

  coinElements.forEach(el => {
    el.textContent = money(user.coins);
  });

  const winsElements = document.querySelectorAll(
    "[data-user-wins], #wins"
  );

  winsElements.forEach(el => {
    el.textContent = money(user.wins);
  });

  const lossesElements = document.querySelectorAll(
    "[data-user-losses], #losses"
  );

  lossesElements.forEach(el => {
    el.textContent = money(user.losses);
  });
}


/* =========================================================
   PAGE / NAVIGATION
   ========================================================= */

function goHome() {
  window.location.href = "index.html";
}

function goLogin() {
  window.location.href = "login.html";
}

function openPage(page) {
  window.location.href = page;
}

window.goHome = goHome;
window.goLogin = goLogin;
window.openPage = openPage;


function setupNavigation() {

  document.querySelectorAll(
    "[data-page]"
  ).forEach(button => {

    button.addEventListener(
      "click",
      () => {
        const page =
          button.getAttribute("data-page");

        if (page) {
          window.location.href = page;
        }
      }
    );

  });


  document.querySelectorAll(
    ".logout-btn"
  ).forEach(button => {
    button.addEventListener(
      "click",
      logout
    );
  });
}


/* =========================================================
   HOME - TOURNAMENTS
   ========================================================= */

async function loadHomeTournaments() {

  const container =
    document.getElementById(
      "tournamentsContainer"
    ) ||
    document.getElementById(
      "tournamentList"
    ) ||
    document.querySelector(
      ".tournament-list"
    );

  if (!container) return;

  try {

    const data =
      await api("/tournaments");

    const tournaments =
      data.tournaments || [];

    if (!tournaments.length) {

      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:35px;">🏆</div>
          <p>No tournaments available</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      tournaments
        .map(tournamentCard)
        .join("");

  } catch (error) {

    container.innerHTML = `
      <div class="empty-state">
        <p>No tournaments available</p>
      </div>
    `;
  }
}


function tournamentCard(t) {

  const id =
    t.id ??
    "";

  const name =
    t.name ||
    t.title ||
    "Ludo Tournament";

  return `
    <div class="room-card">

      <div class="room-card-top">
        <div>
          <span class="room-status">
            TOURNAMENT
          </span>

          <h3>
            ${escapeHTML(name)}
          </h3>
        </div>

        <div class="room-dice">
          🏆
        </div>
      </div>

      <div class="room-details">
        <span>
          👥 ${money(t.players || 0)}
        </span>

        <span>
          🟢 ${escapeHTML(t.status || "Open")}
        </span>
      </div>

      <button
        class="gold-btn"
        onclick="joinTournament('${escapeHTML(id)}')"
      >
        JOIN
      </button>

    </div>
  `;
}


function joinTournament(id) {

  alert(
    "Tournament feature abhi available nahi hai."
  );
}

window.joinTournament = joinTournament;


/* =========================================================
   HOME - ROOMS
   ========================================================= */

async function loadHomeRooms() {

  const container =
    document.getElementById(
      "roomsContainer"
    ) ||
    document.getElementById(
      "roomList"
    ) ||
    document.querySelector(
      ".room-list"
    );

  if (!container) return;

  if (!token()) {

    container.innerHTML = `
      <div class="empty-state">
        <p>Login karke Ludo rooms dekhein.</p>
        <button
          class="gold-btn"
          onclick="goLogin()"
        >
          LOGIN
        </button>
      </div>
    `;

    return;
  }

  try {

    const data =
      await api("/rooms");

    const rooms =
      data.rooms || [];

    const openRooms =
      rooms.filter(room => {

        const status =
          String(
            room.status || ""
          ).toLowerCase();

        return (
          status === "waiting" ||
          status === "open" ||
          status === "lobby"
        );
      });

    if (!openRooms.length) {

      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:35px;">
            🎲
          </div>

          <p>
            No open Ludo room
          </p>

          <button
            class="gold-btn"
            onclick="createRoom()"
          >
            CREATE LUDO ROOM
          </button>
        </div>
      `;

      return;
    }

    container.innerHTML =
      openRooms
        .map(roomCard)
        .join("");

    setupRoomButtons();

  } catch (error) {

    container.innerHTML = `
      <div class="empty-state">
        <p>
          ${escapeHTML(error.message)}
        </p>

        <button
          class="gold-btn"
          onclick="loadHomeRooms()"
        >
          TRY AGAIN
        </button>
      </div>
    `;
  }
}


/* =========================================================
   ROOM CARD
   ========================================================= */

function roomCard(room) {

  const id =
    room.id;

  const name =
    room.name ||
    room.title ||
    `Ludo Room #${id}`;

  /*
    Backend sends:
    playerCount
    maxPlayers
  */

  const maxPlayers =
    Number(
      room.maxPlayers ??
      room.max_players ??
      2
    );

  const playerCount =
    Number(
      room.playerCount ??
      room.player_count ??
      room.players_count ??
      room.players?.length ??
      0
    );

  const status =
    String(
      room.status ||
      "waiting"
    ).toLowerCase();

  const full =
    playerCount >= maxPlayers;

  return `
    <div
      class="room-card"
      data-room-id="${escapeHTML(id)}"
    >

      <div class="room-card-top">

        <div>

          <span class="room-status">
            ${
              status === "waiting"
                ? "OPEN"
                : escapeHTML(
                    status.toUpperCase()
                  )
            }
          </span>

          <h3>
            ${escapeHTML(name)}
          </h3>

        </div>

        <div class="room-dice">
          🎲
        </div>

      </div>

      <div class="room-details">

        <span>
          👥 ${playerCount}/${maxPlayers}
        </span>

        <span>
          🟢 ${escapeHTML(status)}
        </span>

      </div>

      <button
        class="gold-btn room-join-btn"
        data-id="${escapeHTML(id)}"
        ${full ? "disabled" : ""}
      >
        ${
          full
            ? "ROOM FULL"
            : "PLAY NOW"
        }
      </button>

    </div>
  `;
}


function setupRoomButtons() {

  document.querySelectorAll(
    ".room-join-btn"
  ).forEach(button => {

    button.addEventListener(
      "click",
      async () => {

        const id =
          button.dataset.id;

        if (id) {
          await joinRoom(id);
        }

      }
    );

  });
}


/* =========================================================
   CREATE ROOM
   ========================================================= */

async function createRoom() {

  if (!token()) {
    window.location.href =
      "login.html";
    return;
  }

  const button =
    document.getElementById(
      "createRoomBtn"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "CREATING...";
  }

  try {

    const data =
      await api(
        "/rooms",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Ludo Room"
          })
        }
      );

    const room =
      data.room;

    if (!room) {
      throw new Error(
        "Room create response nahi mila."
      );
    }

    saveRoomId(room.id);

    window.location.href =
      `game.html?room=${encodeURIComponent(room.id)}`;

  } catch (error) {

    alert(
      error.message ||
      "Room create nahi hua."
    );

    if (button) {
      button.disabled = false;
      button.textContent =
        "CREATE LUDO ROOM";
    }
  }
}

window.createRoom = createRoom;


/* =========================================================
   JOIN ROOM
   ========================================================= */

async function joinRoom(roomId) {

  if (!token()) {
    window.location.href =
      "login.html";
    return;
  }

  roomId =
    String(roomId || "").trim();

  if (!roomId) {
    alert(
      "Room ID enter karein."
    );
    return;
  }

  try {

    const data =
      await api(
        `/rooms/${encodeURIComponent(roomId)}/join`,
        {
          method: "POST"
        }
      );

    const room =
      data.room;

    if (!room) {
      throw new Error(
        "Room information nahi mili."
      );
    }

    saveRoomId(room.id);

    window.location.href =
      `game.html?room=${encodeURIComponent(room.id)}`;

  } catch (error) {

    alert(
      error.message ||
      "Room join nahi hua."
    );
  }
}

window.joinRoom = joinRoom;


/* =========================================================
   BATTLES PAGE
   ========================================================= */

async function loadBattlesPage() {

  const container =
    document.getElementById(
      "roomsContainer"
    ) ||
    document.getElementById(
      "battleRooms"
    ) ||
    document.getElementById(
      "roomList"
    );

  if (!container) return;

  try {

    const data =
      await api("/rooms");

    const rooms =
      data.rooms || [];

    if (!rooms.length) {

      container.innerHTML = `
        <div class="empty-state">
          <p>
            No open Ludo room
          </p>

          <button
            class="gold-btn"
            onclick="createRoom()"
          >
            CREATE LUDO ROOM
          </button>
        </div>
      `;

      return;
    }

    container.innerHTML =
      rooms
        .map(roomCard)
        .join("");

    setupRoomButtons();

  } catch (error) {

    container.innerHTML = `
      <div class="empty-state">
        <p>
          ${escapeHTML(error.message)}
        </p>
      </div>
    `;
  }
}


/* =========================================================
   GAME PAGE
   ========================================================= */

async function loadGameRoom() {

  const roomId =
    getRoomId();

  if (!roomId) {

    setGameStatus(
      "Room ID nahi mila. Room create ya join karein."
    );

    return;
  }

  saveRoomId(roomId);

  try {

    const data =
      await api(
        `/rooms/${encodeURIComponent(roomId)}`
      );

    currentRoom =
      data.room;

    renderGameRoom(
      currentRoom
    );

    startGamePolling();

  } catch (error) {

    setGameStatus(
      error.message ||
      "Room load nahi hua."
    );
  }
}


/* =========================================================
   GAME STATUS
   ========================================================= */

function setGameStatus(message) {

  const element =
    document.getElementById(
      "gameStatus"
    );

  if (element) {
    element.textContent =
      message;
  }
}


/* =========================================================
   RENDER GAME ROOM
   ========================================================= */

function renderGameRoom(room) {

  if (!room) return;

  currentRoom =
    room;

  const players =
    room.players || [];

  const playerCount =
    players.length;

  const maxPlayers =
    Number(
      room.maxPlayers ||
      room.max_players ||
      2
    );

  const status =
    String(
      room.status ||
      "waiting"
    ).toLowerCase();

  const myId =
    Number(
      currentUser?.id
    );

  const isCreator =
    Number(room.createdBy) === myId;

  const myTurn =
    Number(room.currentTurn) === myId;

  const dice =
    room.diceValue;

  const gameContainer =
    document.getElementById(
      "gameRoom"
    ) ||
    document.getElementById(
      "gameContainer"
    ) ||
    document.querySelector(
      ".game-container"
    );

  if (gameContainer) {

    gameContainer.innerHTML = `
      <div class="game-panel-inner">

        <div class="game-status-box">

          <div>
            <strong>
              ROOM #${escapeHTML(room.id)}
            </strong>
          </div>

          <div style="margin-top:8px;">
            Players:
            <strong>
              ${playerCount}/${maxPlayers}
            </strong>
          </div>

          <div style="margin-top:8px;">
            Status:
            <strong>
              ${escapeHTML(status)}
            </strong>
          </div>

        </div>

        <div
          id="gamePlayers"
          style="margin-top:15px;"
        >
          ${renderPlayers(players, room)}
        </div>

        ${
          status === "playing"
            ? renderLudoBoard(room)
            : `
              <div
                style="
                  text-align:center;
                  padding:20px;
                  color:#c8d8d8;
                "
              >
                ${
                  playerCount < 2
                    ? "Waiting for Player 2..."
                    : "Ready to start!"
                }
              </div>
            `
        }

      </div>
    `;
  }

  updateGameButtons(
    room
  );

  updateDiceUI(
    dice
  );

  const startButton =
    document.getElementById(
      "startGameBtn"
    );

  if (startButton) {

    startButton.onclick =
      () => startRoom(room.id);

    startButton.disabled =
      !(
        isCreator &&
        playerCount === 2 &&
        status === "waiting"
      );

    if (
      status === "playing"
    ) {
      startButton.style.display =
        "none";
    } else {
      startButton.style.display =
        "block";

      startButton.textContent =
        playerCount === 2
          ? "START GAME"
          : `WAITING ${playerCount}/2`;
    }
  }

  const rollButton =
    document.getElementById(
      "rollDiceBtn"
    ) ||
    document.getElementById(
      "rollBtn"
    );

  if (rollButton) {

    rollButton.onclick =
      () => rollDice(room.id);

    rollButton.disabled =
      !(
        status === "playing" &&
        myTurn &&
        !dice
      );

    if (
      status === "playing" &&
      myTurn &&
      !dice
    ) {
      rollButton.textContent =
        "🎲 ROLL DICE";
    } else if (
      status === "playing" &&
      !myTurn
    ) {
      rollButton.textContent =
        "WAIT FOR YOUR TURN";
    } else if (
      dice
    ) {
      rollButton.textContent =
        `🎲 DICE: ${dice}`;
    }
  }
}


/* =========================================================
   PLAYERS
   ========================================================= */

function renderPlayers(
  players,
  room
) {

  if (!players.length) {
    return `
      <div class="player-card">
        Waiting for players...
      </div>
    `;
  }

  return players
    .map(
      (player, index) => {

        const isMe =
          Number(player.id) ===
          Number(currentUser?.id);

        const isTurn =
          Number(room.currentTurn) ===
          Number(player.id);

        return `
          <div
            class="player-card"
            style="
              border-color:
                ${
                  isTurn
                    ? "#f5c451"
                    : "#507477"
                };
            "
          >

            <div
              style="
                display:flex;
                justify-content:space-between;
                gap:10px;
              "
            >

              <strong>
                ${
                  escapeHTML(
                    player.username ||
                    `Player ${index + 1}`
                  )
                }

                ${
                  isMe
                    ? " (YOU)"
                    : ""
                }
              </strong>

              <span>
                ${
                  player.color ===
                  "red"
                    ? "🔴"
                    : "🟢"
                }
              </span>

            </div>

            ${
              isTurn
                ? `
                  <div
                    style="
                      margin-top:6px;
                      color:#f5c451;
                      font-size:12px;
                    "
                  >
                    🎯 YOUR TURN
                  </div>
                `
                : ""
            }

          </div>
        `;
      }
    )
    .join("");
}


/* =========================================================
   SIMPLE LUDO BOARD
   ========================================================= */

function renderLudoBoard(room) {

  const state =
    room.gameState ||
    {};

  const players =
    room.players || [];

  const myId =
    Number(
      currentUser?.id
    );

  const myState =
    state.players?.[myId];

  if (!myState) {
    return "";
  }

  const tokens =
    myState.tokens ||
    [-1, -1, -1, -1];

  const myTurn =
    Number(room.currentTurn) ===
    myId;

  const dice =
    Number(room.diceValue || 0);

  let html = `
    <div
      class="ludo-board"
      style="
        margin-top:20px;
        background:#082e32;
        border:1px solid #d6a93d;
        border-radius:15px;
        padding:14px;
      "
    >

      <div
        style="
          text-align:center;
          color:#f5c451;
          font-weight:bold;
          margin-bottom:12px;
        "
      >
        🎲 YOUR TOKENS
      </div>

      <div
        style="
          display:grid;
          grid-template-columns:
            repeat(4,1fr);
          gap:8px;
        "
      >
  `;

  tokens.forEach(
    (position, index) => {

      const finished =
        position >= 56;

      const home =
        position < 0;

      let label;

      if (home) {
        label =
          `🏠 ${index + 1}`;
      } else if (finished) {
        label =
          `🏆 ${index + 1}`;
      } else {
        label =
          `🎯 ${index + 1}`;
      }

      const canMove =
        myTurn &&
        dice > 0 &&
        !finished;

      html += `
        <button
          type="button"
          ${
            canMove
              ? ""
              : "disabled"
          }
          onclick="
            moveToken(
              ${room.id},
              ${index}
            )
          "
          style="
            padding:13px 5px;
            border-radius:10px;
            border:1px solid #f5c451;
            background:
              ${
                canMove
                  ? "#f5c451"
                  : "#173f43"
              };
            color:
              ${
                canMove
                  ? "#082e32"
                  : "#c8d8d8"
              };
            font-weight:bold;
            cursor:
              ${
                canMove
                  ? "pointer"
                  : "not-allowed"
              };
          "
        >
          ${label}
          <small
            style="
              display:block;
              margin-top:4px;
              font-size:10px;
            "
          >
            ${
              home
                ? "HOME"
                : `POS ${position}`
            }
          </small>
        </button>
      `;
    }
  );

  html += `
      </div>

      <div
        style="
          text-align:center;
          margin-top:14px;
          color:#c8d8d8;
          font-size:12px;
        "
      >
        ${
          myTurn
            ? dice
              ? `Dice ${dice} rolled — token select karein`
              : "Aapki turn — dice roll karein"
            : "Opponent ki turn..."
        }
      </div>

    </div>
  `;

  return html;
}


/* =========================================================
   START GAME
   ========================================================= */

async function startRoom(roomId) {

  if (!roomId) {
    roomId =
      getRoomId();
  }

  if (!roomId) {
    alert(
      "Room ID nahi mila."
    );
    return;
  }

  try {

    const data =
      await api(
        `/rooms/${encodeURIComponent(roomId)}/start`,
        {
          method: "POST"
        }
      );

    currentRoom =
      data.room;

    renderGameRoom(
      currentRoom
    );

  } catch (error) {

    alert(
      error.message ||
      "Game start nahi hua."
    );

    await loadGameRoom();
  }
}

window.startRoom = startRoom;


/* =========================================================
   ROLL DICE
   ========================================================= */

async function rollDice(roomId) {

  if (!roomId) {
    roomId =
      getRoomId();
  }

  try {

    const data =
      await api(
        `/rooms/${encodeURIComponent(roomId)}/dice`,
        {
          method: "POST"
        }
      );

    currentRoom =
      data.room;

    renderGameRoom(
      currentRoom
    );

  } catch (error) {

    alert(
      error.message ||
      "Dice roll nahi hua."
    );

    await loadGameRoom();
  }
}

window.rollDice = rollDice;


/* =========================================================
   MOVE TOKEN
   ========================================================= */

async function moveToken(
  roomId,
  tokenIndex
) {

  try {

    const data =
      await api(
        `/rooms/${encodeURIComponent(roomId)}/move`,
        {
          method: "POST",
          body: JSON.stringify({
            tokenIndex:
              Number(tokenIndex)
          })
        }
      );

    currentRoom =
      data.room;

    if (data.winner) {

      if (
        Number(data.winner) ===
        Number(currentUser?.id)
      ) {

        alert(
          "🎉 Congratulations! Aap jeet gaye!"
        );

      } else {

        alert(
          "Game finished."
        );
      }
    }

    renderGameRoom(
      currentRoom
    );

  } catch (error) {

    alert(
      error.message ||
      "Token move nahi hua."
    );

    await loadGameRoom();
  }
}

window.moveToken = moveToken;


/* =========================================================
   DICE UI
   ========================================================= */

function updateDiceUI(
  dice
) {

  const elements =
    document.querySelectorAll(
      "#diceValue, #dice"
    );

  elements.forEach(
    element => {

      if (
        dice === null ||
        dice === undefined
      ) {
        element.textContent =
          "🎲";
      } else {
        element.textContent =
          `🎲 ${dice}`;
      }

    }
  );
}


/* =========================================================
   GAME BUTTONS
   ========================================================= */

function updateGameButtons(
  room
) {

  const status =
    String(
      room.status || ""
    ).toLowerCase();

  const myId =
    Number(
      currentUser?.id
    );

  const myTurn =
    Number(room.currentTurn) ===
    myId;

  const dice =
    room.diceValue;

  const rollButton =
    document.getElementById(
      "rollDiceBtn"
    ) ||
    document.getElementById(
      "rollBtn"
    );

  if (rollButton) {

    rollButton.disabled =
      !(
        status === "playing" &&
        myTurn &&
        !dice
      );
  }
}


/* =========================================================
   GAME POLLING
   ========================================================= */

function startGamePolling() {

  if (gamePollTimer) {
    clearInterval(
      gamePollTimer
    );
  }

  gamePollTimer =
    setInterval(
      async () => {

        const roomId =
          getRoomId();

        if (!roomId) return;

        try {

          const data =
            await api(
              `/rooms/${encodeURIComponent(roomId)}/state`
            );

          if (data.room) {

            currentRoom =
              data.room;

            renderGameRoom(
              currentRoom
            );
          }

        } catch {
          // Polling error ignore
        }

      },
      2000
    );
}


/* =========================================================
   LEADERBOARD
   ========================================================= */

async function loadLeaderboard() {

  const container =
    document.getElementById(
      "leaderboardContainer"
    ) ||
    document.getElementById(
      "leaderboardList"
    ) ||
    document.querySelector(
      ".leaderboard-list"
    );

  if (!container) return;

  try {

    const data =
      await api(
        "/leaderboard"
      );

    const list =
      data.leaderboard || [];

    if (!list.length) {

      container.innerHTML = `
        <div class="empty-state">
          <p>
            No players yet.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      list
        .map(
          (player, index) => `
            <div
              class="player-card"
              style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
              "
            >

              <div>

                <strong>
                  #${index + 1}
                  ${escapeHTML(
                    player.username
                  )}
                </strong>

                <div
                  style="
                    font-size:12px;
                    color:#c8d8d8;
                    margin-top:5px;
                  "
                >
                  Wins:
                  ${money(player.wins)}
                  &nbsp; | &nbsp;
                  Losses:
                  ${money(player.losses)}
                </div>

              </div>

              <div
                style="
                  color:#f5c451;
                  font-weight:bold;
                "
              >
                🪙 ${money(player.coins)}
              </div>

            </div>
          `
        )
        .join("");

  } catch (error) {

    container.innerHTML = `
      <div class="empty-state">
        <p>
          ${escapeHTML(error.message)}
        </p>
      </div>
    `;
  }
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfilePage() {

  if (!token()) {
    window.location.href =
      "login.html";
    return;
  }

  try {

    const user =
      await loadCurrentUser();

    if (!user) return;

    const battles =
      Number(user.wins || 0) +
      Number(user.losses || 0);

    const fields = {

      profileName:
        user.username,

      profileEmail:
        user.email,

      walletCoins:
        money(user.coins),

      wins:
        money(user.wins),

      losses:
        money(user.losses),

      battles:
        money(battles),

      referrals:
        "0"
    };

    Object.keys(fields)
      .forEach(id => {

        const el =
          document.getElementById(
            id
          );

        if (el) {
          el.textContent =
            fields[id];
        }
      });

  } catch (error) {

    const name =
      document.getElementById(
        "profileName"
      );

    if (name) {
      name.textContent =
        "Unable to load";
    }
  }
}


/* =========================================================
   WALLET
   ========================================================= */

async function loadWalletPage() {

  const element =
    document.getElementById(
      "walletCoins"
    ) ||
    document.querySelector(
      "[data-wallet-coins]"
    );

  if (!element) return;

  try {

    const user =
      await loadCurrentUser();

    if (user) {
      element.textContent =
        money(user.coins);
    }

  } catch {
    element.textContent =
      "0";
  }
}


/* =========================================================
   HISTORY
   ========================================================= */

async function loadHistoryPage() {

  const container =
    document.getElementById(
      "historyContainer"
    ) ||
    document.getElementById(
      "historyList"
    ) ||
    document.querySelector(
      ".history-list"
    );

  if (!container) return;

  try {

    const data =
      await api(
        "/games/history"
      );

    const games =
      data.games || [];

    if (!games.length) {

      container.innerHTML = `
        <div class="empty-state">
          <p>
            No game history yet.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      games
        .map(
          game => `
            <div
              class="player-card"
            >

              <strong>
                Room #${escapeHTML(
                  game.roomId
                )}
              </strong>

              <div
                style="
                  margin-top:6px;
                  font-size:13px;
                "
              >
                Result:
                ${escapeHTML(
                  game.result ||
                  "N/A"
                )}
              </div>

              <div
                style="
                  margin-top:4px;
                  font-size:12px;
                  color:#c8d8d8;
                "
              >
                Dice Rolls:
                ${money(
                  game.diceRolls
                )}
              </div>

            </div>
          `
        )
        .join("");

  } catch (error) {

    container.innerHTML = `
      <div class="empty-state">
        <p>
          ${escapeHTML(error.message)}
        </p>
      </div>
    `;
  }
}


/* =========================================================
   LOGIN FORM
   ========================================================= */

function setupLoginForm() {

  const form =
    document.getElementById(
      "loginForm"
    );

  if (!form) return;

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const email =
        document.getElementById(
          "email"
        )?.value
          .trim()
          .toLowerCase();

      const password =
        document.getElementById(
          "password"
        )?.value || "";

      if (!email || !password) {

        alert(
          "Email aur password enter karein."
        );

        return;
      }

      const button =
        form.querySelector(
          "button[type='submit']"
        );

      if (button) {
        button.disabled = true;
        button.textContent =
          "LOGIN...";
      }

      try {

        const data =
          await api(
            "/auth/login",
            {
              method: "POST",
              body: JSON.stringify({
                email,
                password
              })
            }
          );

        if (!data.token) {
          throw new Error(
            "Login token nahi mila."
          );
        }

        localStorage.setItem(
          TOKEN_KEY,
          data.token
        );

        saveUser(
          data.user
        );

        window.location.href =
          "index.html";

      } catch (error) {

        alert(
          error.message ||
          "Login failed."
        );

        if (button) {
          button.disabled = false;
          button.textContent =
            "LOGIN";
        }
      }
    }
  );
}


/* =========================================================
   REGISTER FORM
   ========================================================= */

function setupRegisterForm() {

  const form =
    document.getElementById(
      "registerForm"
    );

  if (!form) return;

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const username =
        document.getElementById(
          "username"
        )?.value
          .trim();

      const email =
        document.getElementById(
          "email"
        )?.value
          .trim()
          .toLowerCase();

      const password =
        document.getElementById(
          "password"
        )?.value || "";

      if (
        !username ||
        !email ||
        !password
      ) {

        alert(
          "Sabhi details enter karein."
        );

        return;
      }

      if (
        password.length < 6
      ) {

        alert(
          "Password minimum 6 characters ka hona chahiye."
        );

        return;
      }

      const button =
        form.querySelector(
          "button[type='submit']"
        );

      if (button) {
        button.disabled = true;
        button.textContent =
          "CREATING...";
      }

      try {

        const data =
          await api(
            "/auth/register",
            {
              method: "POST",
              body: JSON.stringify({
                username,
                email,
                password
              })
            }
          );

        if (!data.token) {
          throw new Error(
            "Registration token nahi mila."
          );
        }

        localStorage.setItem(
          TOKEN_KEY,
          data.token
        );

        saveUser(
          data.user
        );

        window.location.href =
          "index.html";

      } catch (error) {

        alert(
          error.message ||
          "Registration failed."
        );

        if (button) {
          button.disabled = false;
          button.textContent =
            "REGISTER";
        }
      }
    }
  );
}


/* =========================================================
   JOIN FORM
   ========================================================= */

function setupJoinRoomForm() {

  const input =
    document.getElementById(
      "roomIdInput"
    );

  const button =
    document.getElementById(
      "joinRoomBtn"
    );

  if (!input || !button) {
    return;
  }

  button.addEventListener(
    "click",
    () => {
      joinRoom(
        input.value.trim()
      );
    }
  );

  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        event.preventDefault();

        joinRoom(
          input.value.trim()
        );
      }

    }
  );
}


/* =========================================================
   START BUTTON
   ========================================================= */

function setupGameButtons() {

  const startButton =
    document.getElementById(
      "startGameBtn"
    );

  if (
    startButton &&
    !startButton.dataset.bound
  ) {

    startButton.dataset.bound =
      "true";

    startButton.addEventListener(
      "click",
      () => {
        startRoom(
          getRoomId()
        );
      }
    );
  }


  const rollButton =
    document.getElementById(
      "rollDiceBtn"
    );

  if (
    rollButton &&
    !rollButton.dataset.bound
  ) {

    rollButton.dataset.bound =
      "true";

    rollButton.addEventListener(
      "click",
      () => {
        rollDice(
          getRoomId()
        );
      }
    );
  }
}


/* =========================================================
   PAGE DETECTION
   ========================================================= */

function pageName() {

  return (
    window.location.pathname
      .split("/")
      .pop()
      .toLowerCase() ||
    "index.html"
  );
}


/* =========================================================
   INIT
   ========================================================= */

async function initPage() {

  setupNavigation();
  setupLoginForm();
  setupRegisterForm();
  setupJoinRoomForm();
  setupGameButtons();

  const page =
    pageName();

  /*
    Login page
  */

  if (
    page === "login.html"
  ) {
    return;
  }


  /*
    Load user
  */

  if (token()) {
    await loadCurrentUser();
  } else {
    currentUser =
      getStoredUser();
  }


  /*
    HOME
  */

  if (
    page === "index.html" ||
    page === ""
  ) {

    await Promise.all([
      loadHomeTournaments(),
      loadHomeRooms()
    ]);

    return;
  }


  /*
    BATTLES
  */

  if (
    page === "battles.html"
  ) {

    if (!token()) {
      window.location.href =
        "login.html";
      return;
    }

    await loadBattlesPage();

    return;
  }


  /*
    GAME
  */

  if (
    page === "game.html"
  ) {

    if (!token()) {
      window.location.href =
        "login.html";
      return;
    }

    await loadGameRoom();

    return;
  }


  /*
    LEADERBOARD
  */

  if (
    page ===
    "leaderboard.html"
  ) {

    if (!token()) {
      window.location.href =
        "login.html";
      return;
    }

    await loadLeaderboard();

    return;
  }


  /*
    PROFILE
  */

  if (
    page ===
    "profile.html"
  ) {

    if (!token()) {
      window.location.href =
        "login.html";
      return;
    }

    await loadProfilePage();

    return;
  }


  /*
    WALLET
  */

  if (
    page ===
    "wallet.html"
  ) {

    if (!token()) {
      window.location.href =
        "login.html";
      return;
    }

    await loadWalletPage();

    return;
  }


  /*
    HISTORY
  */

  if (
    page ===
    "history.html"
  ) {

    if (!token()) {
      window.location.href =
        "login.html";
      return;
    }

    await loadHistoryPage();

    return;
  }

}


/* =========================================================
   AUTO START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initPage
);


/* =========================================================
   PAGE EXIT CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (gamePollTimer) {
      clearInterval(
        gamePollTimer
      );
    }

  }
);
