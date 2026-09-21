require("dotenv").config();
const express=require("express"),cors=require("cors"),bcrypt=require("bcryptjs"),jwt=require("jsonwebtoken");
const Database=require("better-sqlite3"),fs=require("fs"),path=require("path");
const app=express();app.use(cors());app.use(express.json());
const PORT=+process.env.PORT||3000,SECRET=process.env.JWT_SECRET||"dev-secret";
const dbFile=path.resolve("./data/ludo-inspire.db");fs.mkdirSync(path.dirname(dbFile),{recursive:true});
const db=new Database(dbFile);db.pragma("foreign_keys=ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,coins INTEGER NOT NULL DEFAULT 1000,wins INTEGER NOT NULL DEFAULT 0,
 losses INTEGER NOT NULL DEFAULT 0,premium INTEGER NOT NULL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS rooms(
 id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,max_players INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'waiting',current_turn INTEGER,dice_value INTEGER,created_by INTEGER NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(created_by) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS room_players(
 room_id INTEGER NOT NULL,user_id INTEGER NOT NULL,joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(room_id,user_id),FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS games(
 id INTEGER PRIMARY KEY AUTOINCREMENT,room_id INTEGER,user_id INTEGER,result TEXT,
 dice_rolls INTEGER DEFAULT 0,played_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS tournaments(
 id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,max_players INTEGER DEFAULT 16,
 status TEXT DEFAULT 'open',starts_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS tournament_players(
 tournament_id INTEGER NOT NULL,user_id INTEGER NOT NULL,
 PRIMARY KEY(tournament_id,user_id));
`);

const sign=u=>jwt.sign({id:u.id,username:u.username},SECRET,{expiresIn:"7d"});
function auth(req,res,next){const h=req.headers.authorization||"",t=h.startsWith("Bearer ")?h.slice(7):null;
if(!t)return res.status(401).json({error:"Missing bearer token"});try{req.user=jwt.verify(t,SECRET);next()}catch{return res.status(401).json({error:"Invalid token"})}}
function admin(req,res,next){const e=db.prepare("SELECT email FROM users WHERE id=?").get(req.user.id)?.email;
if(e!==process.env.ADMIN_EMAIL)return res.status(403).json({error:"Admin access required"});next()}
function room(id){const r=db.prepare(`SELECT id,name,max_players AS maxPlayers,status,current_turn AS currentTurn,
dice_value AS diceValue,created_by AS createdBy FROM rooms WHERE id=?`).get(id);if(!r)return null;
r.players=db.prepare(`SELECT u.id,u.username FROM room_players p JOIN users u ON u.id=p.user_id
WHERE p.room_id=? ORDER BY p.joined_at`).all(id);return r}

app.get("/api/health",(q,s)=>s.json({ok:true,service:"Ludo Inspire Commercial API",cashGaming:false}));
app.get("/api/config",(q,s)=>s.json({appName:process.env.APP_NAME||"Ludo Inspire",
monetization:{ads:true,subscriptions:true,realMoneyGaming:false},virtualCoins:true,
features:{tournaments:true,leaderboard:true,chat:false}}));

app.post("/api/auth/register",async(req,res)=>{const{username,email,password}=req.body||{};
if(!username||!email||!password||password.length<6)return res.status(400).json({error:"Invalid registration data"});
try{const h=await bcrypt.hash(password,12),r=db.prepare("INSERT INTO users(username,email,password_hash) VALUES(?,?,?)")
.run(username.trim(),email.trim().toLowerCase(),h),u=db.prepare(`SELECT id,username,email,coins,wins,losses,premium FROM users WHERE id=?`).get(r.lastInsertRowid);
res.status(201).json({user:u,token:sign(u)})}catch{res.status(409).json({error:"Username or email already exists"})}});
app.post("/api/auth/login",async(req,res)=>{const u=db.prepare("SELECT * FROM users WHERE email=?").get((req.body?.email||"").toLowerCase());
if(!u||!(await bcrypt.compare(req.body?.password||"",u.password_hash)))return res.status(401).json({error:"Invalid credentials"});
res.json({user:{id:u.id,username:u.username,email:u.email,coins:u.coins,wins:u.wins,losses:u.losses,premium:u.premium},token:sign(u)})});
app.get("/api/me",auth,(req,res)=>res.json({user:db.prepare(`SELECT id,username,email,coins,wins,losses,premium,created_at AS createdAt FROM users WHERE id=?`).get(req.user.id)}));

app.post("/api/rooms",auth,(req,res)=>{const name=String(req.body?.name||"Ludo Room").trim(),m=Math.max(2,Math.min(4,+req.body?.maxPlayers||4));
const r=db.prepare("INSERT INTO rooms(name,max_players,created_by) VALUES(?,?,?)").run(name,m,req.user.id);
db.prepare("INSERT INTO room_players(room_id,user_id) VALUES(?,?)").run(r.lastInsertRowid,req.user.id);res.status(201).json({room:room(r.lastInsertRowid)})});
app.get("/api/rooms",auth,(req,res)=>res.json({rooms:db.prepare(`SELECT r.id,r.name,r.max_players AS maxPlayers,r.status,
COUNT(p.user_id) playerCount FROM rooms r LEFT JOIN room_players p ON p.room_id=r.id GROUP BY r.id ORDER BY r.id DESC`).all()}));
app.get("/api/rooms/:id",auth,(req,res)=>{const r=room(+req.params.id);r?res.json({room:r}):res.status(404).json({error:"Room not found"})});
app.post("/api/rooms/:id/join",auth,(req,res)=>{const id=+req.params.id,r=room(id);if(!r)return res.status(404).json({error:"Room not found"});
if(r.status!=="waiting")return res.status(409).json({error:"Game already started"});if(r.players.some(x=>x.id===req.user.id))return res.json({room:r});
if(r.players.length>=r.maxPlayers)return res.status(409).json({error:"Room full"});
db.prepare("INSERT INTO room_players(room_id,user_id) VALUES(?,?)").run(id,req.user.id);res.json({room:room(id)})});
app.post("/api/rooms/:id/start",auth,(req,res)=>{const id=+req.params.id,r=room(id);if(!r)return res.status(404).json({error:"Room not found"});
if(r.createdBy!==req.user.id)return res.status(403).json({error:"Only creator can start"});if(r.players.length<2)return res.status(409).json({error:"At least 2 players required"});
db.prepare("UPDATE rooms SET status='playing',current_turn=?,dice_value=NULL WHERE id=?").run(r.players[0].id,id);res.json({room:room(id)})});
app.post("/api/rooms/:id/dice",auth,(req,res)=>{const id=+req.params.id,r=room(id);if(!r)return res.status(404).json({error:"Room not found"});
if(r.status!=="playing")return res.status(409).json({error:"Game is not playing"});if(r.currentTurn!==req.user.id)return res.status(403).json({error:"Not your turn"});
const d=1+Math.floor(Math.random()*6),i=r.players.findIndex(x=>x.id===req.user.id),n=r.players[(i+1)%r.players.length].id;
db.prepare("UPDATE rooms SET dice_value=?,current_turn=? WHERE id=?").run(d,n,id);
db.prepare("INSERT INTO games(room_id,user_id,result,dice_rolls) VALUES(?,?,?,1)").run(id,req.user.id,"turn");
res.json({dice:d,nextTurn:n,room:room(id)})});

app.get("/api/leaderboard",auth,(req,res)=>res.json({leaderboard:db.prepare(`SELECT id,username,coins,wins,losses,
premium,CASE WHEN wins+losses=0 THEN 0 ELSE ROUND(100.0*wins/(wins+losses),2) END winRate
FROM users ORDER BY wins DESC,coins DESC LIMIT 100`).all()}));
app.get("/api/games/history",auth,(req,res)=>res.json({games:db.prepare(`SELECT id,room_id roomId,result,dice_rolls diceRolls,played_at playedAt
FROM games WHERE user_id=? ORDER BY id DESC LIMIT 100`).all(req.user.id)}));

app.post("/api/tournaments",auth,(req,res)=>{const n=String(req.body?.name||"Ludo Tournament").trim(),m=Math.max(2,Math.min(128,+req.body?.maxPlayers||16));
const r=db.prepare("INSERT INTO tournaments(name,max_players,starts_at) VALUES(?,?,?)").run(n,m,req.body?.startsAt||null);
res.status(201).json({tournament:db.prepare("SELECT * FROM tournaments WHERE id=?").get(r.lastInsertRowid)})});
app.get("/api/tournaments",auth,(req,res)=>res.json({tournaments:db.prepare(`SELECT t.*,COUNT(p.user_id) playerCount
FROM tournaments t LEFT JOIN tournament_players p ON p.tournament_id=t.id GROUP BY t.id ORDER BY t.id DESC`).all()}));
app.post("/api/tournaments/:id/join",auth,(req,res)=>{const id=+req.params.id,t=db.prepare("SELECT * FROM tournaments WHERE id=?").get(id);
if(!t)return res.status(404).json({error:"Tournament not found"});const c=db.prepare("SELECT COUNT(*) c FROM tournament_players WHERE tournament_id=?").get(id).c;
if(c>=t.max_players)return res.status(409).json({error:"Tournament full"});try{db.prepare("INSERT INTO tournament_players VALUES(?,?)").run(id,req.user.id)}catch{}
res.json({ok:true})});

app.get("/api/admin/stats",auth,admin,(req,res)=>res.json({
users:db.prepare("SELECT COUNT(*) c FROM users").get().c,
rooms:db.prepare("SELECT COUNT(*) c FROM rooms").get().c,
games:db.prepare("SELECT COUNT(*) c FROM games").get().c,
tournaments:db.prepare("SELECT COUNT(*) c FROM tournaments").get().c,
virtualCoins:db.prepare("SELECT COALESCE(SUM(coins),0) c FROM users").get().c
}));
app.get("/api/admin/users",auth,admin,(req,res)=>res.json({users:db.prepare("SELECT id,username,email,coins,wins,losses,premium,created_at createdAt FROM users ORDER BY id DESC").all()}));
app.post("/api/admin/users/:id/coins",auth,admin,(req,res)=>{const a=Number(req.body?.amount);if(!Number.isInteger(a)||a===0)return res.status(400).json({error:"Invalid amount"});
const u=db.prepare("SELECT id,coins FROM users WHERE id=?").get(+req.params.id);if(!u)return res.status(404).json({error:"User not found"});
const c=Math.max(0,u.coins+a);db.prepare("UPDATE users SET coins=? WHERE id=?").run(c,u.id);res.json({userId:u.id,coins:c})});
app.post("/api/admin/users/:id/premium",auth,admin,(req,res)=>{const p=req.body?.premium?1:0;
const r=db.prepare("UPDATE users SET premium=? WHERE id=?").run(p,+req.params.id);if(!r.changes)return res.status(404).json({error:"User not found"});res.json({userId:+req.params.id,premium:!!p})});
app.use((q,s)=>s.status(404).json({error:"Endpoint not found"}));app.listen(PORT,()=>console.log(`Ludo Inspire API on :${PORT}`));
