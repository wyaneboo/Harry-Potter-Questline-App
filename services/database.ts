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
 * - Sets up tables to store your projects, quests, profile, drops, and inventory
 * - Provides functions to initialize or reset the database
 * 
 * HOW DOES IT WORK?
 * When the app starts, it checks if the database exists. If not, it creates
 * one with all the necessary tables. Your data stays on YOUR device - it
 * doesn't go to any server.
 * 
 * TABLES CREATED:
 * - projects: Stores project containers for organizing quests
 * - quests: Stores tasks with difficulty, status, and due dates
 * - profile: Single-row user profile with level, XP, and galleons
 * - drops: Item definitions with rarity tiers
 * - inventory: User's collected items with quantities
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

    -- Projects table: stores project/category containers
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT,
      icon TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      archived INTEGER DEFAULT 0
    );

    -- Quests table: stores tasks/quests
    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      title TEXT NOT NULL,
      details TEXT,
      difficulty TEXT DEFAULT 'Normal' CHECK(difficulty IN ('Easy', 'Normal', 'Hard', 'Boss')),
      due_at TEXT,
      status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'done')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    -- Profile table: single-row user profile
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      galleons INTEGER DEFAULT 0
    );

    -- Drops table: item definitions
    CREATE TABLE IF NOT EXISTS drops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rarity TEXT DEFAULT 'common' CHECK(rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
      icon TEXT
    );

    -- Inventory table: user's collected items
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      drop_id TEXT NOT NULL,
      qty INTEGER DEFAULT 1,
      FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE
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
    DROP TABLE IF EXISTS inventory;
    DROP TABLE IF EXISTS drops;
    DROP TABLE IF EXISTS quests;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS profile;
  `);
  await initializeDatabase();
  console.log('Database reset successfully');
}

export { db };
