# 🎮 Game Analytics Project

A real-time event-driven game analytics system that captures gameplay data, processes it through a backend API, and visualizes insights using Snowflake dashboards.

---

## 🚀 Overview

This project combines a playable web-based game with a full analytics pipeline. The system captures gameplay events such as game start, score updates, coins collected, and game over, then sends them to a backend API. These events are stored in Snowflake and used to generate analytics dashboards and insights.

The goal of this project is to demonstrate how real-time event tracking and data warehousing can support data-driven game development.

---

## 🏗️ Architecture

```
Player
   ↓
Game (Frontend)
   ↓
Backend API (Event Collector)
   ↓
Snowflake Data Warehouse
   ↓
Analytics Dashboard
```

### 🔹 Frontend (Game)

* Tracks player actions
* Generates structured event data
* Sends events via HTTP POST requests

### 🔹 Backend API

* REST endpoint: `/event`
* Validates event payload
* Forwards data to Snowflake
* Handles logging & error management

### 🔹 Snowflake

* Stores gameplay events
* Enables SQL-based analytics
* Powers dashboards and reporting

---

## 📊 Event Schema

Example event payload:

```json
{
  "event_id": "uuid",
  "event": "game_over",
  "player_id": "player_01",
  "session_id": "session_01",
  "score": 120,
  "coins": 15,
  "speed": 8,
  "ts": "2026-02-14T00:00:00Z"
}
```

---

## 📈 Analytics Metrics

The following insights are generated:

* Total sessions
* Average score per session
* Total coins collected
* Top players by score
* Event frequency distribution
* Daily active players
* Gameplay trend analysis

---

## 🛠️ Tech Stack

**Frontend:** HTML / CSS / JavaScript
**Backend:** Node.js + Express
**Database/Warehouse:** Snowflake
**Visualization:** Snowflake Worksheets / Dashboard

---

## ⚙️ How to Run Locally

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/your-repo-name.git
cd your-repo-name
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Setup Environment Variables

Create a `.env` file:

```
PORT=3000
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PASSWORD=your_password
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
```

⚠️ Do NOT commit your `.env` file.

### 4️⃣ Start the Server

```bash
npm start
```

Server runs on:

```
http://localhost:3000
```

---

## 🔌 API Endpoint

### POST `/event`

Receives gameplay events.

Example using curl:

```bash
curl -X POST http://localhost:3000/event \
-H "Content-Type: application/json" \
-d '{"event":"game_start","player_id":"p1"}'
```

---

## 🧠 Key Learnings

* Designing an event-driven architecture
* Structuring analytics-ready event schemas
* Integrating backend APIs with Snowflake
* Writing analytical SQL queries
* Building dashboards for actionable insights

---

## 🌟 Future Improvements

* Real-time streaming ingestion
* Player retention analysis
* Advanced cohort analysis
* Leaderboard system
* Cloud deployment (AWS / Vercel)

---

## 📜 License

This project was built for educational and hackathon purposes.

---
