try{
  db.exec("ALTER TABLE rooms ADD COLUMN game_state TEXT");
}catch{}
