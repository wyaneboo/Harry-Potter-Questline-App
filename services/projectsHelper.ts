/**
 * =============================================================================
 * PROJECTS HELPER - Database Operations for Projects
 * =============================================================================
 * 
 * WHAT IS THIS FILE?
 * This file contains all the helper functions to interact with the "projects" 
 * table in the database. Projects are containers for organizing quests.
 * 
 * WHAT DOES IT DO?
 * - CREATE: Add new projects to the database
 * - READ: Get all projects, get a single project, filter by archived status
 * - UPDATE: Modify project details (title, description, color, icon)
 * - DELETE: Remove projects from the database
 * - ARCHIVE: Archive/unarchive projects
 * 
 * =============================================================================
 */

import { db } from './database';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/** Represents a project in the database */
export interface Project {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  archived: number; // 0 = false, 1 = true
}

/** Data needed to create a new project */
export interface CreateProjectData {
  id?: string;
  title: string;
  description?: string;
  color?: string;
  icon?: string;
}

/** Data for updating an existing project */
export interface UpdateProjectData {
  title?: string;
  description?: string;
  color?: string;
  icon?: string;
  archived?: number;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Generate a UUID for new projects */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new project in the database.
 * @param data - The project data (title required, others optional)
 * @returns The ID of the newly created project
 */
export async function createProject(data: CreateProjectData): Promise<string> {
  const id = data.id || generateUUID();
  await db.runAsync(
    `INSERT INTO projects (id, title, description, color, icon) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      data.title,
      data.description || null,
      data.color || null,
      data.icon || null
    ]
  );
  console.log(`Project created with ID: ${id}`);
  return id;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Get all projects from the database.
 * @param includeArchived - Whether to include archived projects (default false)
 * @returns Array of all projects
 */
export async function getAllProjects(includeArchived: boolean = false): Promise<Project[]> {
  const query = includeArchived
    ? 'SELECT * FROM projects ORDER BY created_at DESC'
    : 'SELECT * FROM projects WHERE archived = 0 ORDER BY created_at DESC';
  const projects = await db.getAllAsync<Project>(query);
  return projects;
}

/**
 * Get a single project by its ID.
 * @param id - The project ID
 * @returns The project or null if not found
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const project = await db.getFirstAsync<Project>('SELECT * FROM projects WHERE id = ?', [id]);
  return project || null;
}

/**
 * Get all archived projects.
 * @returns Array of archived projects
 */
export async function getArchivedProjects(): Promise<Project[]> {
  const projects = await db.getAllAsync<Project>(
    'SELECT * FROM projects WHERE archived = 1 ORDER BY created_at DESC'
  );
  return projects;
}

/**
 * Get the total count of projects.
 * @returns Object with total, active, and archived counts
 */
export async function getProjectCounts(): Promise<{ total: number; active: number; archived: number }> {
  const total = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM projects');
  const archived = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM projects WHERE archived = 1'
  );
  return {
    total: total?.count || 0,
    archived: archived?.count || 0,
    active: (total?.count || 0) - (archived?.count || 0)
  };
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Update a project's details.
 * @param id - The project ID to update
 * @param data - The fields to update
 * @returns True if update was successful
 */
export async function updateProject(id: string, data: UpdateProjectData): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.title !== undefined) {
    fields.push('title = ?');
    values.push(data.title);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.color !== undefined) {
    fields.push('color = ?');
    values.push(data.color);
  }
  if (data.icon !== undefined) {
    fields.push('icon = ?');
    values.push(data.icon);
  }
  if (data.archived !== undefined) {
    fields.push('archived = ?');
    values.push(data.archived);
  }

  if (fields.length === 0) {
    console.log('No fields to update');
    return false;
  }

  values.push(id);
  const result = await db.runAsync(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  console.log(`Project ${id} updated, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Archive a project.
 * @param id - The project ID to archive
 * @returns True if successful
 */
export async function archiveProject(id: string): Promise<boolean> {
  return updateProject(id, { archived: 1 });
}

/**
 * Unarchive a project.
 * @param id - The project ID to unarchive
 * @returns True if successful
 */
export async function unarchiveProject(id: string): Promise<boolean> {
  return updateProject(id, { archived: 0 });
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Delete a project from the database.
 * Note: Associated quests will have their project_id set to NULL.
 * @param id - The project ID to delete
 * @returns True if deletion was successful
 */
export async function deleteProject(id: string): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
  console.log(`Project ${id} deleted, rows affected: ${result.changes}`);
  return result.changes > 0;
}

/**
 * Delete all archived projects.
 * @returns Number of projects deleted
 */
export async function deleteAllArchivedProjects(): Promise<number> {
  const result = await db.runAsync('DELETE FROM projects WHERE archived = 1');
  console.log(`Deleted ${result.changes} archived projects`);
  return result.changes;
}
