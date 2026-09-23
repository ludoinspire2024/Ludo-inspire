const API = "https://ludo-inspire.onrender.com";

let token = localStorage.getItem("ludo_token");

const $ = id => document.getElementById(id);


/* =========================
   API
========================= */

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
   AUTH TABS
========================= */

function showLogin() {

  $("loginForm").hidden = false;
  $("registerForm").hidden = true;

  $("loginTab").classList.add("active");
  $("registerTab").classList.remove("active");

}


function showRegister() {

  $("loginForm").hidden = true;
  $("registerForm").hidden = false;

  $("loginTab").classList.remove("active");
  $("registerTab").classList.add("active");

}


/* =========================
   REGISTER
========================= */

async function register() {

  const username = $("regUser").value.trim();
  const email = $("regEmail").value.trim();
  const password = $("regPass").value;

  $("authMsg").textContent = "Creating account...";

  try {

    const data = await api(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password
        })
      }
    );

    token = data.token;

    localStorage.setItem(
      "ludo_token",
      token
    );

    $("authMsg").textContent = "";

    showProfilePage();

  } catch (error) {

    $("authMsg").textContent =
      error.message;

  }

}


/* =========================
   LOGIN
========================= */

async function login() {

  const email = $("email").value.trim();
  const password = $("password").value;

  $("authMsg").textContent = "Signing in...";

  try {

    const data = await api(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    token = data.token;

    localStorage.setItem(
      "ludo_token",
      token
    );

    $("authMsg").textContent = "";

    showProfilePage();

  } catch (error) {

    $("authMsg").textContent =
      error.message;

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

    $("profileName").textContent =
      user.username || "Player";

    $("profileEmail").textContent =
      user.email || "";

    $("coinTop").textContent =
      user.coins ?? 0;

    $("cashWon").textContent =
      user.coins ?? 0;

    const battles =
      (user.wins || 0) +
      (user.losses || 0);

    $("battles").textContent =
      battles;

    $("referrals").textContent =
      0;

    $("walletCoins").textContent =
      user.coins ?? 0;

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
   HOME
========================= */

function showHomePage() {

  closeDrawer();

  $("homePage").hidden = false;
  $("profilePage").hidden = true;
  $("auth").hidden = true;

}


/* =========================
   PROFILE PAGE
========================= */

function showProfilePage() {

  closeDrawer();

  if (!token) {
    showAuth();
    return;
  }

  $("homePage").hidden = true;
  $("profilePage").hidden = false;
  $("auth").hidden = true;

  hideBoxes();

  loadProfile();

}


/* =========================
   AUTH SCREEN
========================= */

function showAuth() {

  $("homePage").hidden = true;
  $("profilePage").hidden = true;
  $("auth").hidden = false;

  showLogin();

}


/* =========================
   WALLET
========================= */

async function openWallet() {

  closeDrawer();

  $("homePage").hidden = true;
  $("profilePage").hidden = false;
  $("auth").hidden = true;

  hideBoxes();

  $("walletBox").hidden = false;

  await loadProfile();

  $("walletBox").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

}


/* =========================
   REFERRAL
========================= */

function openReferral() {

  closeDrawer();

  $("homePage").hidden = true;
  $("profilePage").hidden = false;
  $("auth").hidden = true;

  hideBoxes();

  $("referralBox").hidden = false;

  $("referralBox").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

}


/* =========================
   HISTORY
========================= */

async function showHistory() {

  closeDrawer();

  $("homePage").hidden = true;
  $("profilePage").hidden = false;
  $("auth").hidden = true;

  hideBoxes();

  const box = $("historyBox");

  box.hidden = false;

  box.innerHTML =
    "Loading history...";

  try {

    const data =
      await api("/api/games/history");

    if (
      !data.games ||
      data.games.length === 0
    ) {

      box.innerHTML =
        "<b>History</b><p>No games played yet.</p>";

      return;

    }

    box.innerHTML =
      "<b>Game History</b>" +
      data.games.map(game => {

        return `
          <div class="rank">
            <span>
              Game #${game.id}
            </span>

            <span>
              ${game.result || "Played"}
            </span>
          </div>
        `;

      }).join("");

  } catch (error) {

    box.innerHTML =
      "<b>History</b><p>Unable to load history.</p>";

  }

}


/* =========================
   HIDE INFO BOXES
========================= */

function hideBoxes() {

  if ($("historyBox"))
    $("historyBox").hidden = true;

  if ($("walletBox"))
    $("walletBox").hidden = true;

  if ($("referralBox"))
    $("referralBox").hidden = true;

}


/* =========================
   COPY REFERRAL
========================= */

function copyReferral() {

  const code =
    $("refCode").textContent.trim();

  if (navigator.clipboard) {

    navigator.clipboard.writeText(code);

  }

  alert("Referral code copied");

}


/* =========================
   COMPLETE PROFILE
========================= */

function completeProfile() {

  alert(
    "Profile details section coming soon."
  );

}


/* =========================
   LOGOUT
========================= */

function logout() {

  token = null;

  localStorage.removeItem(
    "ludo_token"
  );

  showAuth();

}


/* =========================
   DRAWER
========================= */

function toggleDrawer() {

  $("drawer").classList.toggle("open");

  $("overlay").classList.toggle("show");

}


function closeDrawer() {

  $("drawer").classList.remove("open");

  $("overlay").classList.remove("show");

}


/* =========================
   INITIAL LOAD
========================= */

async function init() {

  if (token) {

    try {

      await api("/api/me");

      showProfilePage();

    } catch {

      logout();

    }

  } else {

    showAuth();

  }

}


/* START */

init();
