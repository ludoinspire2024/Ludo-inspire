try{
  db.exec("ALTER TABLE rooms ADD COLUMN game_state TEXT");
}catch{}
app.post("/api/rooms/:id/dice",auth,(req,res)=>{
  const id=+req.params.id;
  const r=room(id);

  if(!r)
    return res.status(404).json({error:"Room not found"});

  if(r.status!=="playing")
    return res.status(409).json({error:"Game is not playing"});

  if(r.currentTurn!==req.user.id)
    return res.status(403).json({error:"Not your turn"});

  if(r.diceValue)
    return res.status(409).json({error:"Move your token first"});

  const d=1+Math.floor(Math.random()*6);

  db.prepare(`
    UPDATE rooms
    SET dice_value=?
    WHERE id=?
  `).run(d,id);

  res.json({
    dice:d,
    room:room(id)
  });
});
