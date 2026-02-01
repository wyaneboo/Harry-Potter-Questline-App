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

import * as SQLite from "expo-sqlite";
import { seedDefaultDrops } from "./dropsHelper";

// Open/create the database synchronously
const db = SQLite.openDatabaseSync("hpqdatabase.db");

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
      status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'doing', 'done')),
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
      acquired_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE
    );

    -- Settings table: key-value store for app configuration
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration: Fix quests table CHECK constraint to include 'doing' status
  // This is needed for databases created with an older schema
  try {
    // Check if we need to migrate by trying to get table info
    const tableInfo = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='quests'",
    );

    // If the table exists but doesn't include 'doing' in the constraint, migrate it
    if (tableInfo?.sql && !tableInfo.sql.includes("'doing'")) {
      console.log('Migrating quests table to include "doing" status...');

      await db.execAsync(`
        -- Create new table with correct schema
        CREATE TABLE IF NOT EXISTS quests_new (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          title TEXT NOT NULL,
          details TEXT,
          difficulty TEXT DEFAULT 'Normal' CHECK(difficulty IN ('Easy', 'Normal', 'Hard', 'Boss')),
          due_at TEXT,
          status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'doing', 'done')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          completed_at TEXT,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        );
        
        -- Copy data from old table
        INSERT INTO quests_new SELECT * FROM quests;
        
        -- Drop old table and rename new one
        DROP TABLE quests;
        ALTER TABLE quests_new RENAME TO quests;
      `);

      console.log("Quests table migration completed successfully");
    }
  } catch (migrationError) {
    console.log("Migration check:", migrationError);
    // Migration not needed or already done
  }

  // Migration: Add house and profile_picture columns to profile table
  try {
    const profileTableInfo = await db.getFirstAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='profile'",
    );

    if (profileTableInfo?.sql && !profileTableInfo.sql.includes("house")) {
      console.log(
        "Migrating profile table to add house and profile_picture...",
      );
      await db.execAsync(`
        ALTER TABLE profile ADD COLUMN house TEXT DEFAULT 'Gryffindor';
        ALTER TABLE profile ADD COLUMN profile_picture TEXT DEFAULT 'default';
      `);
      console.log("Profile table migration completed successfully");
    }
  } catch (profileMigrationError) {
    console.log("Profile migration check:", profileMigrationError);
  }

  // Seed default drops if the table is empty
  try {
    const dropCount = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM drops",
    );
    if (dropCount?.count === 0) {
      console.log("Seeding default drops...");
      await seedDefaultDrops();
    }
  } catch (seedError) {
    console.log("Drop seeding error:", seedError);
  }

  console.log("Database initialized successfully");
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
    DROP TABLE IF EXISTS settings;
  `);
  await initializeDatabase();
  console.log("Database reset successfully");
}

export { db };
