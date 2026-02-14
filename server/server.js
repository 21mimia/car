import "dotenv/config";
import express from "express";
import cors from "cors";
import snowflake from "snowflake-sdk";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const conn = snowflake.createConnection({
  account: process.env.SNOW_ACCOUNT,
  username: process.env.SNOW_USERNAME,
  password: process.env.SNOW_PASSWORD,
  warehouse: process.env.SNOW_WAREHOUSE,
  database: process.env.SNOW_DATABASE,
  schema: process.env.SNOW_SCHEMA,
  role: process.env.SNOW_ROLE,
});

conn.connect((err) => {
  if (err) console.error("❌ Snowflake connect failed:", err.message);
  else console.log("✅ Snowflake connected");
});

function execSql(sqlText, binds = []) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => (err ? reject(err) : resolve(rows)),
    });
  });
}

app.post("/event", async (req, res) => {
  try {
    const p = req.body || {};
    if (!p.event_id) {
      return res.status(400).json({ ok: false, error: "Missing event_id" });
    }

    await execSql(
      `MERGE INTO GAME_EVENTS t
       USING (
         SELECT
           ? AS EVENT_ID,
           TO_TIMESTAMP_NTZ(?) AS TS,
           ? AS PLAYER_ID,
           ? AS SESSION_ID,
           ? AS EVENT,
           ? AS SCORE,
           ? AS SPEED,
           ? AS COINS,
           PARSE_JSON(?) AS DATA
       ) s
       ON t.EVENT_ID = s.EVENT_ID
       WHEN NOT MATCHED THEN
         INSERT (EVENT_ID, TS, PLAYER_ID, SESSION_ID, EVENT, SCORE, SPEED, COINS, DATA)
         VALUES (s.EVENT_ID, s.TS, s.PLAYER_ID, s.SESSION_ID, s.EVENT, s.SCORE, s.SPEED, s.COINS, s.DATA);`,
      [
        p.event_id,
        p.ts,
        p.player_id ?? null,
        p.session_id ?? null,
        p.event ?? null,
        Number.isFinite(p.score) ? p.score : null,
        Number.isFinite(p.speed) ? p.speed : null,
        Number.isFinite(p.coins) ? p.coins : null,
        JSON.stringify(p),
      ]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error("❌ Insert failed:", e.message);
    res.status(500).json({ ok: false });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT || 3000}`);
});
