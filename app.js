// Set this to your deployed Ludo Inspire API URL.
// Example: const API = "https://your-api.example.com";
const API = localStorage.getItem("LUDO_API_URL") || "https://ludo-inspire.onrender.com";
let token=localStorage.getItem("ludo_token"), currentRoom=null;

const $=id=>document.getElementById(id);
async function api(path,options={}){options.headers={...(options.headers||{}),"Content-Type":"application/json"};
if(token)options.headers.Authorization="Bearer "+token;
const r=await fetch(API+path,options);const d=await r.json().catch(()=>({}));
if(!r.ok)throw new Error(d.error||"Request failed");return d}

async function login(){try{const d=await api("/api/auth/login",{method:"POST",body:JSON.stringify({email:$("email").value,password:$("password").value})});
token=d.token;localStorage.setItem("ludo_token",token);showHome()}catch(e){$("authMsg").textContent=e.message}}
async function register(){try{const d=await api("/api/auth/register",{method:"POST",body:JSON.stringify({username:$("regUser").value,email:$("regEmail").value,password:$("regPass").value})});
token=d.token;localStorage.setItem("ludo_token",token);showHome()}catch(e){$("authMsg").textContent=e.message}}
function logout(){token=null;localStorage.removeItem("ludo_token");$("home").hidden=true;$("auth").hidden=false;$("status").textContent="Offline"}
async function showHome(){try{await loadProfile();await loadRooms();await loadLeaderboard();$("auth").hidden=true;$("home").hidden=false;$("status").textContent="Online"}catch(e){logout();$("authMsg").textContent=e.message}}
async function loadProfile(){const d=await api("/api/me");const u=d.user;$("profile").innerHTML=`<b>${u.username}</b><br>🪙 ${u.coins} virtual coins<br>🏆 Wins: ${u.wins} · Losses: ${u.losses}`;}
async function loadLeaderboard(){const d=await api("/api/leaderboard");$("leaderboard").innerHTML=d.leaderboard.slice(0,10).map((u,i)=>`${i+1}. <b>${u.username}</b> — ${u.wins} wins · ${u.coins} coins`).join("<br>")||"No players yet."}
async function loadRooms(){const d=await api("/api/rooms");$("rooms").innerHTML=d.rooms.map(r=>`<div class="room"><b>${r.name}</b><br><span class="muted">${r.playerCount}/${r.maxPlayers} players · ${r.status}</span>
<div class="row"><button onclick="joinRoom(${r.id})">Join</button></div></div>`).join("")||"No rooms. Create one."}
async function createRoom(){try{const d=await api("/api/rooms",{method:"POST",body:JSON.stringify({name:"Ludo Room",maxPlayers:4})});currentRoom=d.room;renderGame()}catch(e){alert(e.message)}}
async function joinRoom(id){try{const d=await api("/api/rooms/"+id+"/join",{method:"POST"});currentRoom=d.room;renderGame()}catch(e){alert(e.message)}}
async function renderGame(){if(!currentRoom)return;$("game").innerHTML=`<b>${currentRoom.name}</b><p>${currentRoom.players.length}/${currentRoom.maxPlayers} players</p>
<div class="row"><button onclick="startGame(${currentRoom.id})">Start</button><button onclick="roll(${currentRoom.id})">🎲 Roll Dice</button></div><div id="dice" class="dice">🎲</div>`}
async function startGame(id){try{const d=await api("/api/rooms/"+id+"/start",{method:"POST"});currentRoom=d.room;renderGame()}catch(e){alert(e.message)}}
async function roll(id){try{const d=await api("/api/rooms/"+id+"/dice",{method:"POST"});currentRoom=d.room;$("dice").textContent="🎲 "+d.dice;loadProfile()}catch(e){alert(e.message)}}
if(token)showHome();else{$("auth").hidden=false}
