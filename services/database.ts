/**
 * =============================================================================
 * DATABASE SERVICE - hpqdatabase.db
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file sets up and manages the app's local database - think of it as the
 * app's memory that saves your data even after you close the app.
 * 
 * WHAT DOES IT DO?
 * - Creates a SQLite database file on your device (like a mini spreadsheet)
 * - Sets up tables to store your quests, achievements, and progress
 * - Provides functions to initialize or reset the database
 * 
 * HOW DOES IT WORK?
 * When the app starts, it checks if the database exists. If not, it creates
 * one with all the necessary tables. Your data stays on YOUR device - it
 * doesn't go to any server.
 * 
 * TABLES CREATED:
 * - quests: Stores all available quests (title, description, rewards, etc.)
 * - user_progress: Tracks your XP, level, and Hogwarts house
 * - quest_completions: Records which quests you've finished and when
 * - achievements: Stores unlockable badges and accomplishments
 * 
 * =============================================================================
 */

import * as SQLite from 'expo-sqlite';

// Open/create the database synchronously
const db = SQLite.openDatabaseSync('hpqdatabase.db');

/**
 * Initialize the database with required tables.
 * This should be called once when the app starts.
 */
export async function initializeDatabase(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Quests table: stores quest information
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      difficulty TEXT DEFAULT 'Normal',
      xp_reward INTEGER DEFAULT 10,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- User progress table: tracks user profile and progress
    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      galleons INTEGER DEFAULT 0
    );

    -- Quest completions table: tracks which quests are completed
    CREATE TABLE IF NOT EXISTS quest_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quest_id INTEGER NOT NULL,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
    );

    -- Achievements table: stores unlockable achievements
    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      is_unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT
    );
  `);

  console.log('Database initialized successfully');
}

/**
 * Reset the database by dropping all tables and reinitializing.
 * Use with caution - this will delete all data!
 */
export async function resetDatabase(): Promise<void> {
  await db.execAsync(`
    DROP TABLE IF EXISTS quest_completions;
    DROP TABLE IF EXISTS achievements;
    DROP TABLE IF EXISTS quests;
    DROP TABLE IF EXISTS user_progress;
  `);
  await initializeDatabase();
  console.log('Database reset successfully');
}

export { db };

