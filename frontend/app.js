/* =========================================================
   LUDO INSPIRE - FRONTEND APP.JS
   Backend: https://ludo-inspire.onrender.com
   ========================================================= */

const API_BASE = "https://ludo-inspire.onrender.com/api";
const TOKEN_KEY = "ludo_token";

let currentUser = null;
let gamePollTimer = null;
let deferredInstallPrompt = null;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function pageName() {
    let name = window.location.pathname.split("/").pop();
    return name || "index.html";
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function getRoomId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || localStorage.getItem("ludo_room_id");
}

function saveRoomId(id) {
    if (id) localStorage.setItem("ludo_room_id", id);
}

function money(value) {
    const n = Number(value || 0);
    return n.toLocaleString("en-IN");
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message, type = "info") {
    let toast = $("#toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function showLoading(element, text = "Loading...") {
    if (element) {
        element.innerHTML = `
            <div class="loading-box">
                <div class="spinner"></div>
                <div>${escapeHTML(text)}</div>
            </div>
        `;
    }
}

function emptyBox(text) {
    return `
        <div class="empty-box">
            <div class="empty-icon">🎲</div>
            <div>${escapeHTML(text)}</div>
        </div>
    `;
}


/* =========================================================
   API
   ========================================================= */

async function api(endpoint, options = {}) {

    const token = getToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {

        if (response.status === 401) {
            clearToken();
        }

        throw new Error(
            data.message ||
            data.error ||
            `Request failed (${response.status})`
        );
    }

    return data;
}

function getArray(data, keys = []) {

    if (Array.isArray(data)) return data;

    for (const key of keys) {
        if (Array.isArray(data?.[key])) {
            return data[key];
        }
    }

    return [];
}

function getUserFromResponse(data) {
    return data?.user || data?.data?.user || data?.data || data;
}


/* =========================================================
   AUTH / CURRENT USER
   ========================================================= */

async function loadCurrentUser() {

    if (!getToken()) {
        currentUser = null;
        updateUserUI(null);
        return null;
    }

    try {
        const data = await api("/me");
        currentUser = getUserFromResponse(data);
        updateUserUI(currentUser);
        return currentUser;

    } catch (error) {

        currentUser = null;
        clearToken();
        updateUserUI(null);

        return null;
    }
}


function updateUserUI(user) {

    const username =
        user?.username ||
        user?.name ||
        "Guest Player";

    const email =
        user?.email ||
        "";

    const coins =
        user?.coins ??
        user?.balance ??
        0;

    const wins =
        user?.wins ??
        0;


    const headerCoins = $("#headerCoins");
    if (headerCoins) {
        headerCoins.textContent = money(coins);
    }

    const headerWins = $("#headerWins");
    if (headerWins) {
        headerWins.textContent = money(wins);
    }


    const drawerUsername = $("#drawerUsername");
    if (drawerUsername) {
        drawerUsername.textContent = username;
    }

    const drawerEmail = $("#drawerEmail");
    if (drawerEmail) {
        drawerEmail.textContent = email;
    }


    const usernameEls = $$(".user-name");
    usernameEls.forEach(el => {
        el.textContent = username;
    });


    const coinEls = $$(".user-coins");
    coinEls.forEach(el => {
        el.textContent = money(coins);
    });
}


/* =========================================================
   DRAWER
   ========================================================= */

function setupDrawer() {

    const menuBtn = $("#menuBtn");
    const drawer = $("#sideDrawer");
    const overlay = $("#drawerOverlay");
    const closeBtn = $("#drawerClose");

    function openDrawer() {
        if (drawer) drawer.classList.add("open");
        if (overlay) overlay.classList.add("show");
        document.body.classList.add("drawer-open");
    }

    function closeDrawer() {
        if (drawer) drawer.classList.remove("open");
        if (overlay) overlay.classList.remove("show");
        document.body.classList.remove("drawer-open");
    }

    if (menuBtn) {
        menuBtn.addEventListener("click", openDrawer);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeDrawer);
    }

    if (overlay) {
        overlay.addEventListener("click", closeDrawer);
    }

    $$(".drawer-link").forEach(link => {
        link.addEventListener("click", closeDrawer);
    });


    const logoutBtn = $("#logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            clearToken();
            localStorage.removeItem("ludo_room_id");
            showToast("Logged out successfully", "success");

            setTimeout(() => {
                window.location.href = "login.html";
            }, 500);
        });
    }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    const currentPage = pageName();

    $$(".bottom-nav a, .drawer-link").forEach(link => {

        const href = link.getAttribute("href");

        if (!href) return;

        if (
            href === currentPage ||
            (currentPage === "index.html" && href === "./")
        ) {
            link.classList.add("active");
        }

    });
}


/* =========================================================
   INSTALL APP
   ========================================================= */

function setupInstallApp() {

    window.addEventListener("beforeinstallprompt", event => {

        event.preventDefault();

        deferredInstallPrompt = event;

    });


    const installBtn = $("#installAppBtn");

    if (installBtn) {

        installBtn.addEventListener("click", async () => {

            if (!deferredInstallPrompt) {
                showToast(
                    "Browser menu se Add to Home Screen use karein",
                    "info"
                );
                return;
            }

            deferredInstallPrompt.prompt();

            await deferredInstallPrompt.userChoice;

            deferredInstallPrompt = null;
        });
    }
}


/* =========================================================
   HOME
   ========================================================= */

async function loadHome() {

    await Promise.allSettled([
        loadHomeTournaments(),
        loadHomeRooms()
    ]);
}


async function loadHomeTournaments() {

    const box = $("#homeTournaments");

    if (!box) return;

    showLoading(box, "Loading tournaments...");

    try {

        const data = await api("/tournaments");

        const tournaments =
            getArray(data, ["tournaments", "items"]);

        if (!tournaments.length) {

            box.innerHTML = emptyBox(
                "No tournaments available"
            );

            return;
        }

        box.innerHTML = tournaments
            .slice(0, 6)
            .map(tournamentCard)
            .join("");

        bindTournamentButtons();

    } catch (error) {

        box.innerHTML = emptyBox(
            "Unable to load tournaments"
        );
    }
}


function tournamentCard(t) {

    const id = t.id;

    const name =
        t.name ||
        t.title ||
        "Ludo Tournament";

    const prize =
        t.prize ??
        t.prize_pool ??
        t.reward ??
        0;

    const players =
        t.players_count ??
        t.player_count ??
        0;

    return `
        <div class="tournament-card">

            <div class="tournament-icon">🏆</div>

            <div class="tournament-info">

                <h3>${escapeHTML(name)}</h3>

                <div class="tournament-meta">
                    <span>👥 ${money(players)}</span>
                    <span>🪙 ${money(prize)}</span>
                </div>

            </div>

            <button
                class="gold-btn tournament-join-btn"
                data-id="${escapeHTML(id)}"
            >
                JOIN
            </button>

        </div>
    `;
}


function bindTournamentButtons() {

    $$(".tournament-join-btn").forEach(button => {

        button.addEventListener("click", () => {

            joinTournament(button.dataset.id);

        });

    });
}


async function loadHomeRooms() {

    const box = $("#homeRooms");

    if (!box) return;

    showLoading(box, "Loading Ludo rooms...");

    try {

        const data = await api("/rooms");

        let rooms =
            getArray(data, ["rooms", "items"]);

        rooms = rooms.filter(room =>
            !room.status ||
            ["waiting", "open", "lobby"].includes(
                String(room.status).toLowerCase()
            )
        );

        if (!rooms.length) {

            box.innerHTML = emptyBox(
                "No open Ludo rooms"
            );

            return;
        }

        box.innerHTML = rooms
            .slice(0, 8)
            .map(roomCard)
            .join("");

        bindRoomButtons();

    } catch (error) {

        box.innerHTML = emptyBox(
            "Unable to load Ludo rooms"
        );
    }
}


function roomCard(room) {

    const id = room.id;

    const name =
        room.name ||
        room.title ||
        `Ludo Room #${id}`;

    const maxPlayers =
        room.max_players ||
        room.maxPlayers ||
        4;

    const playerCount =
        room.player_count ??
        room.players_count ??
        room.players?.length ??
        0;

    return `
        <div class="room-card">

            <div class="room-card-top">

                <div>
                    <span class="room-status">OPEN</span>
                    <h3>${escapeHTML(name)}</h3>
                </div>

                <div class="room-dice">🎲</div>

            </div>

            <div class="room-details">

                <span>
                    👥 ${money(playerCount)}/${money(maxPlayers)}
                </span>

                <span>
                    🟢 Waiting
                </span>

            </div>

            <button
                class="gold-btn room-join-btn"
                data-id="${escapeHTML(id)}"
            >
                PLAY NOW
            </button>

        </div>
    `;
}


function bindRoomButtons() {

    $$(".room-join-btn").forEach(button => {

        button.addEventListener("click", () => {

            joinRoom(button.dataset.id);

        });

    });
}


/* =========================================================
   ROOMS / BATTLES
   ========================================================= */

async function loadBattlesPage() {

    const box = $("#openBattles") || $("#battlesList");

    if (!box) return;

    showLoading(box, "Loading battles...");

    try {

        const data = await api("/rooms");

        const rooms =
            getArray(data, ["rooms", "items"]);

        if (!rooms.length) {

            box.innerHTML = emptyBox(
                "No open battles"
            );

            return;
        }

        box.innerHTML = rooms
            .map(roomCard)
            .join("");

        bindRoomButtons();

    } catch (error) {

        box.innerHTML = emptyBox(
            "Unable to load battles"
        );
    }
}


async function createRoom() {

    if (!getToken()) {

        window.location.href = "login.html";
        return;
    }


    const nameInput =
        $("#roomName") ||
        $("#battleName");

    const maxPlayersInput =
        $("#maxPlayers") ||
        $("#roomPlayers");

    const name =
        nameInput?.value.trim() ||
        "Ludo Room";

    const maxPlayers =
        Number(maxPlayersInput?.value || 4);


    try {

        const data = await api("/rooms", {
            method: "POST",
            body: JSON.stringify({
                name,
                max_players: maxPlayers
            })
        });

        const room =
            data.room ||
            data.data ||
            data;

        if (room?.id) {

            saveRoomId(room.id);

            showToast(
                "Room created successfully",
                "success"
            );

            setTimeout(() => {
                window.location.href =
                    `game.html?room=${room.id}`;
            }, 500);

        } else {

            showToast(
                "Room create response invalid",
                "error"
            );
        }

    } catch (error) {

        showToast(
            error.message ||
            "Room create failed",
            "error"
        );
    }
}


async function joinRoom(roomId) {

    if (!getToken()) {

        showToast(
            "Pehle login karein",
            "error"
        );

        setTimeout(() => {
            window.location.href = "login.html";
        }, 700);

        return;
    }


    try {

        await api(`/rooms/${roomId}/join`, {
            method: "POST"
        });

        saveRoomId(roomId);

        showToast(
            "Room joined successfully",
            "success"
        );

        setTimeout(() => {

            window.location.href =
                `game.html?room=${roomId}`;

        }, 500);

    } catch (error) {

        showToast(
            error.message ||
            "Unable to join room",
            "error"
        );
    }
}


async function startRoom(roomId) {

    try {

        await api(`/rooms/${roomId}/start`, {
            method: "POST"
        });

        showToast(
            "Game started",
            "success"
        );

        await loadGameRoom();

    } catch (error) {

        showToast(
            error.message ||
            "Unable to start game",
            "error"
        );
    }
}


/* =========================================================
   TOURNAMENTS
   ========================================================= */

async function loadTournamentsPage() {

    const box =
        $("#tournamentsList") ||
        $("#tournamentList");

    if (!box) return;

    showLoading(box, "Loading tournaments...");

    try {

        const data = await api("/tournaments");

        const tournaments =
            getArray(data, ["tournaments", "items"]);

        if (!tournaments.length) {

            box.innerHTML =
                emptyBox("No tournaments found");

            return;
        }

        box.innerHTML =
            tournaments
                .map(tournamentCard)
                .join("");

        bindTournamentButtons();

    } catch (error) {

        box.innerHTML =
            emptyBox("Unable to load tournaments");
    }
}


async function joinTournament(id) {

    if (!getToken()) {

        window.location.href = "login.html";
        return;
    }

    try {

        await api(`/tournaments/${id}/join`, {
            method: "POST"
        });

        showToast(
            "Tournament joined successfully",
            "success"
        );

    } catch (error) {

        showToast(
            error.message ||
            "Unable to join tournament",
            "error"
        );
    }
}


/* =========================================================
   LEADERBOARD
   ========================================================= */

async function loadLeaderboard() {

    const box =
        $("#leaderboardList") ||
        $("#leaderboardBody");

    if (!box) return;

    showLoading(box, "Loading leaderboard...");

    try {

        const data = await api("/leaderboard");

        const players =
            getArray(data, [
                "leaderboard",
                "players",
                "items"
            ]);

        if (!players.length) {

            box.innerHTML =
                emptyBox("Leaderboard is empty");

            return;
        }


        if (box.tagName === "TBODY") {

            box.innerHTML = players
                .map((player, index) => {

                    const username =
                        player.username ||
                        player.name ||
                        "Player";

                    const wins =
                        player.wins || 0;

                    const coins =
                        player.coins || 0;

                    return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHTML(username)}</td>
                            <td>${money(wins)}</td>
                            <td>${money(coins)}</td>
                        </tr>
                    `;

                })
                .join("");

        } else {

            box.innerHTML = players
                .map((player, index) => {

                    return `
                        <div class="leaderboard-row">

                            <div class="rank">
                                #${index + 1}
                            </div>

                            <div class="leaderboard-user">
                                ${escapeHTML(
                                    player.username ||
                                    player.name ||
                                    "Player"
                                )}
                            </div>

                            <div>
                                🏆 ${money(player.wins || 0)}
                            </div>

                            <div>
                                🪙 ${money(player.coins || 0)}
                            </div>

                        </div>
                    `;

                })
                .join("");
        }

    } catch (error) {

        box.innerHTML =
            emptyBox("Unable to load leaderboard");
    }
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile() {

    const box = $("#profileContent");

    try {

        const data = await api("/me");

        const user =
            getUserFromResponse(data);

        currentUser = user;

        updateUserUI(user);


        if (!box) {

            fillProfileFields(user);
            return;
        }


        box.innerHTML = `
            <div class="profile-main-card">

                <div class="profile-avatar">
                    👤
                </div>

                <h2>
                    ${escapeHTML(
                        user.username ||
                        user.name ||
                        "Player"
                    )}
                </h2>

                <p>
                    ${escapeHTML(user.email || "")}
                </p>

            </div>

            <div class="stats-grid">

                <div class="stat-card">
                    <strong>
                        ${money(user.coins || 0)}
                    </strong>
                    <span>Coins</span>
                </div>

                <div class="stat-card">
                    <strong>
                        ${money(user.wins || 0)}
                    </strong>
                    <span>Wins</span>
                </div>

                <div class="stat-card">
                    <strong>
                        ${money(user.losses || 0)}
                    </strong>
                    <span>Losses</span>
                </div>

            </div>
        `;

    } catch (error) {

        if (error.message) {
            showToast(error.message, "error");
        }
    }
}


function fillProfileFields(user) {

    const fields = {
        profileUsername:
            user.username || user.name || "Player",

        profileEmail:
            user.email || "",

        profileCoins:
            money(user.coins || 0),

        profileWins:
            money(user.wins || 0),

        profileLosses:
            money(user.losses || 0)
    };

    Object.entries(fields).forEach(([id, value]) => {

        const el = $("#" + id);

        if (el) {
            el.textContent = value;
        }

    });
}


/* =========================================================
   WALLET
   ========================================================= */

async function loadWallet() {

    try {

        const data = await api("/me");

        const user =
            getUserFromResponse(data);

        const coins =
            user.coins ??
            user.balance ??
            0;


        const balanceEls = [
            "#walletBalance",
            "#walletCoins",
            "#coinBalance"
        ];

        balanceEls.forEach(selector => {

            const el = $(selector);

            if (el) {
                el.textContent = money(coins);
            }

        });

    } catch (error) {

        showToast(
            "Unable to load wallet",
            "error"
        );
    }
}


/* =========================================================
   HISTORY
   ========================================================= */

async function loadHistory() {

    const box =
        $("#historyList") ||
        $("#gameHistory");

    if (!box) return;

    showLoading(box, "Loading history...");

    try {

        const data = await api("/games/history");

        const games =
            getArray(data, [
                "games",
                "history",
                "items"
            ]);

        if (!games.length) {

            box.innerHTML =
                emptyBox("No game history yet");

            return;
        }


        box.innerHTML = games
            .map(game => {

                const result =
                    game.result ||
                    game.status ||
                    "Completed";

                const date =
                    game.created_at ||
                    game.createdAt ||
                    "";

                return `
                    <div class="history-row">

                        <div class="history-icon">
                            🎲
                        </div>

                        <div class="history-info">

                            <strong>
                                Ludo Game
                            </strong>

                            <small>
                                ${escapeHTML(date)}
                            </small>

                        </div>

                        <div class="history-result">
                            ${escapeHTML(result)}
                        </div>

                    </div>
                `;

            })
            .join("");

    } catch (error) {

        box.innerHTML =
            emptyBox("Unable to load history");
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

function setupLogin() {

    const loginForm = $("#loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const email =
                    $("#loginEmail")?.value.trim() ||
                    loginForm.querySelector(
                        'input[name="email"]'
                    )?.value.trim();

                const password =
                    $("#loginPassword")?.value ||
                    loginForm.querySelector(
                        'input[name="password"]'
                    )?.value;


                if (!email || !password) {

                    showToast(
                        "Email aur password enter karein",
                        "error"
                    );

                    return;
                }


                try {

                    const data = await api(
                        "/auth/login",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                email,
                                password
                            })
                        }
                    );


                    const token =
                        data.token ||
                        data.accessToken ||
                        data.data?.token;


                    if (!token) {

                        throw new Error(
                            "Login token nahi mila"
                        );
                    }


                    setToken(token);

                    currentUser =
                        getUserFromResponse(data);

                    showToast(
                        "Login successful",
                        "success"
                    );


                    setTimeout(() => {

                        const next =
                            new URLSearchParams(
                                window.location.search
                            ).get("next");

                        window.location.href =
                            next ||
                            "index.html";

                    }, 500);


                } catch (error) {

                    showToast(
                        error.message ||
                        "Login failed",
                        "error"
                    );
                }

            }
        );
    }


    const registerForm = $("#registerForm");

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const username =
                    $("#registerUsername")?.value.trim() ||
                    registerForm.querySelector(
                        'input[name="username"]'
                    )?.value.trim();

                const email =
                    $("#registerEmail")?.value.trim() ||
                    registerForm.querySelector(
                        'input[name="email"]'
                    )?.value.trim();

                const password =
                    $("#registerPassword")?.value ||
                    registerForm.querySelector(
                        'input[name="password"]'
                    )?.value;


                if (!username || !email || !password) {

                    showToast(
                        "Sabhi fields fill karein",
                        "error"
                    );

                    return;
                }


                try {

                    const data = await api(
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


                    const token =
                        data.token ||
                        data.accessToken ||
                        data.data?.token;


                    if (token) {

                        setToken(token);

                        currentUser =
                            getUserFromResponse(data);

                        showToast(
                            "Account created successfully",
                            "success"
                        );

                        setTimeout(() => {
                            window.location.href =
                                "index.html";
                        }, 500);

                    } else {

                        showToast(
                            "Registration successful. Ab login karein.",
                            "success"
                        );

                        setTimeout(() => {
                            window.location.href =
                                "login.html";
                        }, 800);
                    }


                } catch (error) {

                    showToast(
                        error.message ||
                        "Registration failed",
                        "error"
                    );
                }

            }
        );
    }
}


/* =========================================================
   GAME PAGE
   ========================================================= */

async function loadGameRoom() {

    const roomId = getRoomId();

    if (!roomId) {

        const box = $("#gameContainer");

        if (box) {
            box.innerHTML =
                emptyBox("Room ID missing");
        }

        return;
    }


    const gameBox =
        $("#gameContainer") ||
        $("#gameRoom") ||
        document.querySelector(".game-container");


    try {

        const data =
            await api(`/rooms/${roomId}`);

        const room =
            data.room ||
            data.data ||
            data;


        renderGameRoom(room);

    } catch (error) {

        if (gameBox) {

            gameBox.innerHTML =
                emptyBox(
                    error.message ||
                    "Unable to load game"
                );
        }
    }
}


function renderGameRoom(room) {

    const roomId = room.id;

    saveRoomId(roomId);


    const status =
        room.status ||
        "waiting";

    const diceValue =
        room.dice_value ??
        room.diceValue ??
        0;


    let players =
        room.players ||
        room.room_players ||
        room.roomPlayers ||
        [];


    if (!Array.isArray(players)) {
        players = [];
    }


    const diceEl =
        $("#diceValue") ||
        $("#dice");

    if (diceEl) {

        diceEl.textContent =
            diceValue || "🎲";

    }


    const statusEl =
        $("#gameStatus");

    if (statusEl) {

        statusEl.textContent =
            String(status).toUpperCase();

    }


    const playersBox =
        $("#gamePlayers") ||
        $("#playersList");


    if (playersBox) {

        playersBox.innerHTML =
            players.length
                ? players.map((player, index) => {

                    return `
                        <div class="game-player">

                            <div class="player-number">
                                ${index + 1}
                            </div>

                            <div class="player-name">
                                ${escapeHTML(
                                    player.username ||
                                    player.name ||
                                    player.email ||
                                    "Player"
                                )}
                            </div>

                        </div>
                    `;

                }).join("")
                : emptyBox("Waiting for players...");
    }


    const rollBtn =
        $("#rollDiceBtn") ||
        $("#rollBtn");


    if (rollBtn) {

        rollBtn.onclick = () => {
            rollDice(roomId);
        };


        if (
            status !== "playing" &&
            status !== "started"
        ) {

            rollBtn.disabled = true;

        } else {

            rollBtn.disabled = false;
        }
    }


    const startBtn =
        $("#startGameBtn");

    if (startBtn) {

        startBtn.onclick = () => {
            startRoom(roomId);
        };


        if (
            currentUser &&
            room.created_by &&
            String(room.created_by) ===
            String(currentUser.id)
        ) {

            startBtn.style.display = "";

        } else {

            startBtn.style.display = "none";
        }
    }
}


async function rollDice(roomId) {

    const rollBtn =
        $("#rollDiceBtn") ||
        $("#rollBtn");

    if (rollBtn) {
        rollBtn.disabled = true;
    }


    try {

        const data =
            await api(`/rooms/${roomId}/dice`, {
                method: "POST"
            });


        const value =
            data.dice_value ??
            data.diceValue ??
            data.dice ??
            data.value;


        const diceEl =
            $("#diceValue") ||
            $("#dice");


        if (diceEl && value) {
            diceEl.textContent = value;
        }


        showToast(
            `Dice: ${value || "?"}`,
            "success"
        );


        await loadGameRoom();


    } catch (error) {

        showToast(
            error.message ||
            "Dice roll failed",
            "error"
        );

    } finally {

        if (rollBtn) {
            rollBtn.disabled = false;
        }
    }
}


/* =========================================================
   SUPPORT
   ========================================================= */

function setupSupport() {

    const supportButtons =
        $$(".support-btn, #supportBtn");

    supportButtons.forEach(button => {

        button.addEventListener("click", () => {

            window.open(
                "https://wa.me/919521050705",
                "_blank"
            );

        });

    });


    const chatButton =
        $("#floatingChat") ||
        $("#whatsappChat");

    if (chatButton) {

        chatButton.addEventListener("click", () => {

            window.open(
                "https://wa.me/919521050705",
                "_blank"
            );

        });
    }
}


/* =========================================================
   CREATE ROOM FORM
   ========================================================= */

function setupRoomForms() {

    const createForm =
        $("#createRoomForm") ||
        $("#createBattleForm");


    if (createForm) {

        createForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                createRoom();

            }
        );
    }
}


/* =========================================================
   PROTECTED PAGES
   ========================================================= */

async function checkProtectedPage() {

    const protectedPages = [
        "profile.html",
        "wallet.html",
        "battles.html",
        "history.html",
        "game.html"
    ];


    const currentPage = pageName();

    if (!protectedPages.includes(currentPage)) {
        return true;
    }


    if (!getToken()) {

        window.location.href =
            `login.html?next=${encodeURIComponent(
                currentPage
            )}`;

        return false;
    }


    if (!currentUser) {

        const user =
            await loadCurrentUser();

        if (!user) {

            window.location.href =
                `login.html?next=${encodeURIComponent(
                    currentPage
                )}`;

            return false;
        }
    }

    return true;
}


/* =========================================================
   GAME AUTO REFRESH
   ========================================================= */

function startGamePolling() {

    if (pageName() !== "game.html") {
        return;
    }


    clearInterval(gamePollTimer);

    gamePollTimer =
        setInterval(() => {

            loadGameRoom();

        }, 2000);
}


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

async function initPage() {

    setupDrawer();
    setupNavigation();
    setupInstallApp();
    setupLogin();
    setupSupport();
    setupRoomForms();


    const allowed =
        await checkProtectedPage();

    if (!allowed) {
        return;
    }


    await loadCurrentUser();


    const page =
        pageName();


    switch (page) {

        case "":
        case "/":
        case "index.html":
            await loadHome();
            break;


        case "tournaments.html":
            await loadTournamentsPage();
            break;


        case "leaderboard.html":
            await loadLeaderboard();
            break;


        case "profile.html":
            await loadProfile();
            break;


        case "wallet.html":
            await loadWallet();
            break;


        case "battles.html":
            await loadBattlesPage();
            break;


        case "history.html":
            await loadHistory();
            break;


        case "game.html":
            await loadGameRoom();
            startGamePolling();
            break;


        case "support.html":
            break;
    }
}


/* =========================================================
   GLOBAL BUTTONS
   ========================================================= */

window.joinRoom = joinRoom;
window.startRoom = startRoom;
window.rollDice = rollDice;
window.joinTournament = joinTournament;
window.createRoom = createRoom;


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initPage
);
