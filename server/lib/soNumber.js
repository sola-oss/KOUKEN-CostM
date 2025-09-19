/**
 * Sales Order Number Generation Utility
 * Generates sequential SO numbers in format: SO-YYYYMM-0001
 */

/**
 * Generates the next sales order number
 * @param {Database} db - SQLite database instance
 * @param {Date} dateUtc - UTC date for generating the number
 * @returns {string} - Next SO number in format SO-YYYYMM-0001
 */
export function nextSoNo(db, dateUtc) {
  const year = dateUtc.getUTCFullYear();
  const month = String(dateUtc.getUTCMonth() + 1).padStart(2, '0');
  const yyyymm = `${year}${month}`;
  const key = `SO-${yyyymm}`;

  // Start a transaction for atomic sequence generation
  const transaction = db.transaction(() => {
    // Try to get current sequence value
    const currentSeq = db.prepare(`
      SELECT value FROM sequences WHERE key = ?
    `).get(key);

    let nextValue;
    if (currentSeq) {
      // Increment existing sequence
      nextValue = currentSeq.value + 1;
      db.prepare(`
        UPDATE sequences SET value = ? WHERE key = ?
      `).run(nextValue, key);
    } else {
      // Create new sequence starting at 1
      nextValue = 1;
      db.prepare(`
        INSERT INTO sequences (key, value) VALUES (?, ?)
      `).run(key, nextValue);
    }

    return nextValue;
  });

  const sequenceValue = transaction();
  
  // Format as 4-digit zero-padded number
  const paddedSequence = String(sequenceValue).padStart(4, '0');
  
  return `${key}-${paddedSequence}`;
}