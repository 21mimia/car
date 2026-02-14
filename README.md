🎮 Project Overview

This project is a real-time game analytics system built around an interactive web-based game. The game allows players to play sessions, earn scores and coins, and trigger gameplay events such as game start, level completion, and game over.

The core objective of this project is not only to build the game itself, but to design and implement a complete data pipeline that captures gameplay events and transforms them into meaningful analytics insights.

The system works as follows:

The game frontend generates structured event data during gameplay.

Events are sent to a backend API endpoint.

The backend processes and forwards event data to the analytics warehouse (Snowflake).

Snowflake stores, processes, and enables querying of gameplay data.

Dashboards and SQL queries provide insights such as player performance, session behavior, and engagement metrics.

This project demonstrates how real-time event tracking, backend event collection, cloud data warehousing, and analytics dashboards can work together to support data-driven game development and decision-making.

Architecture

Game → Backend → Snowflake → Dashboard
