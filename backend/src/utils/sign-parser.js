/**
 * Parse sign text lines into #Key:Value pairs.
 * Format: Each line can contain one or more #Key:Value pairs.
 * Example: "#Name:MyKit #Item:Diamond" → { Name: "MyKit", Item: "Diamond" }
 * 
 * @param {string[]} lines - Array of sign text lines (max 4 for Minecraft signs)
 * @returns {Object} Parsed key-value pairs
 */
export function parseSignText(lines) {
  const result = {};
  const regex = /#(\w+):([^\s#]*)/g;
  
  for (const line of lines) {
    if (!line) continue;
    let match;
    while ((match = regex.exec(line)) !== null) {
      result[match[1]] = match[2];
    }
  }
  
  return result;
}

/**
 * Extract chest name from parsed sign data.
 * Returns the #Name value or null if not present.
 * 
 * @param {Object} signData - Parsed sign data from parseSignText
 * @returns {string|null} Chest name or null
 */
export function extractChestName(signData) {
  return signData.Name || null;
}

/**
 * Check if a sign is attached to a chest block face.
 * Signs must be on front or back face (not top/bottom/sides).
 * 
 * @param {Object} chestPos - Chest block position { x, y, z }
 * @param {Object} signPos - Sign block position { x, y, z }
 * @param {string} signFace - The face the sign is placed on ('north', 'south', 'east', 'west', 'up', 'down')
 * @returns {boolean} True if sign is on front or back face
 */
export function isSignOnChestFace(chestPos, signPos, signFace) {
  const validFaces = ['north', 'south'];
  if (!validFaces.includes(signFace)) return false;
  
  // Verify sign is adjacent to chest on the validated face
  const dz = signPos.z - chestPos.z;
  const dy = signPos.y - chestPos.y;
  const dx = signPos.x - chestPos.x;
  
  if (signFace === 'north') return dz === -1 && dy === 0 && dx === 0;
  if (signFace === 'south') return dz === 1 && dy === 0 && dx === 0;
  return false;
}