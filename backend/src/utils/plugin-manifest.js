import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Read and parse plugin.json manifest from a plugin directory.
 *
 * @param {string} pluginDir - Absolute path to the plugin directory
 * @returns {Promise<Object>} Parsed manifest object
 * @throws {Error} If plugin.json is missing or invalid JSON
 */
export async function parseManifest(pluginDir) {
  const manifestPath = join(pluginDir, 'plugin.json');

  let raw;
  try {
    raw = await readFile(manifestPath, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read plugin manifest at ${manifestPath}: ${err.message}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in plugin manifest at ${manifestPath}: ${err.message}`);
  }

  return manifest;
}

/**
 * Validate that a manifest has all required fields.
 *
 * Required: id, name, version, entry
 *
 * @param {Object} manifest - Parsed manifest object
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateManifest(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['Manifest is not an object'] };
  }

  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Missing or invalid "id" field (must be a non-empty string)');
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Missing or invalid "name" field (must be a non-empty string)');
  }

  if (!manifest.version || typeof manifest.version !== 'string') {
    errors.push('Missing or invalid "version" field (must be a non-empty string)');
  }

  if (!manifest.entry || typeof manifest.entry !== 'string') {
    errors.push('Missing or invalid "entry" field (must be a non-empty string)');
  }

  return { valid: errors.length === 0, errors };
}
