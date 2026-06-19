const fs = require('fs');
const readline = require('readline');
const path = require('path');

/**
 * Creates a stream that reads a pipe-separated legacy file line by line
 * and yields parsed record objects.
 * 
 * @param {string} filePath - Path to the legacy TXT file
 * @param {Array<string>} fields - Field names to map tokens to
 * @returns {AsyncGenerator<Object>} Generator yielding parsed records
 */
async function* extractRecords(filePath, fields) {
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const tokens = line.split('|').map(t => t.trim());
    
    // Map tokens to keys
    const record = {};
    fields.forEach((field, index) => {
      record[field] = tokens[index] || null;
    });

    yield record;
  }
}

module.exports = { extractRecords };
