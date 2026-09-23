const API="https://ludo-inspire.onrender.com";
let token=localStorage.getItem("ludo_token"),currentRoom=null,pollTimer=null;
const $=id=>document.getElementById(id);
async function api(path,opt={}){opt.headers={...(opt.headers||{}),"Content-Type":"application/json"};if(token)opt.headers.Authorization="Bearer "+token;const r=await fetch(API+path,opt);const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d}
function showLogin(){if($("loginForm"))$("loginForm").hidden=false;if($("registerForm"))$("registerForm").hidden=true;$("loginTab")?.classList.add("active");$("registerTab")?.classList.remove("active")}
function showRegister(){if($("loginForm"))$("loginForm").hidden=true;if($("registerForm"))$("registerForm").hidden=false;$("loginTab")?.classList.remove("active");$("registerTab")?.classList.add("active")}
async function register(){ $("authMsg").textContent="Creating account...";try{const d=await api("/api/auth/register",{method:"POST",body:JSON.stringify({username:$("regUser").value.trim(),email:$("regEmail").value.trim(),password:$("regPass").value})});token=d.token;localStorage.setItem("ludo_token",token);await showHome()}catch(e){$("authMsg").textContent=e.message}}
async function login(){ $("authMsg").textContent="Signing in...";try{const d=await api("/api/auth/login",{method:"POST",body:JSON.stringify({email:$("email").value.trim(),password:$("password").value})});token=d.token;localStorage.setItem("ludo_token",token);await showHome()}catch(e){$("authMsg").textContent=e.message}}
async function showHome(){try{await loadProfile();await loadRooms();await loadLeaderboard();$("auth").hidden=true;document.querySelector(".hero")?.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){$("authMsg").textContent=e.message}}
async function loadProfile(){const d=await api("/api/me"),u=d.user;if($("coinTop"))$("coinTop").textContent=u.coins;if($("profile"))$("profile").innerHTML=`<b>${u.username}</b><br>🪙 ${u.coins} virtual coins<br>🏆 ${u.wins} wins · ${u.losses} losses`}
async function loadLeaderboard(){try{const d=await api("/api/leaderboard");if($("leaderboard"))$("leaderboard").innerHTML=d.leaderboard.slice(0,10).map((u,i)=>`<div class="rank"><span>${i+1}. <b>${u.username}</b></span><span>${u.wins} wins</span></div>`).join("")}catch{}}
async function loadRooms(){try{const d=await api("/api/rooms");if($("rooms"))$("rooms").innerHTML=d.rooms.map(r=>`<div class="rank"><span><b>${r.name}</b><br>${r.playerCount}/${r.maxPlayers} · ${r.status}</span><button class="game-btn" onclick="joinRoom(${r.id})">Join</button></div>`).join("")}catch{}}
async function createRoom(){try{const d=await api("/api/rooms",{method:"POST",body:JSON.stringify({name:"Ludo Room",maxPlayers:4})});openGame(d.room)}catch(e){alert(e.message)}}
async function joinRoom(id){try{const d=await api(`/api/rooms/${id}/join`,{method:"POST"});openGame(d.room)}catch(e){alert(e.message)}}
function openGame(room){currentRoom=room;alert("Room opened: "+room.name)}
function logout(){token=null;localStorage.removeItem("ludo_token");location.reload()}
if(token){loadProfile()}
