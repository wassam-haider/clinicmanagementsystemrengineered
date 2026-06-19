const mongoose = require('../backend/node_modules/mongoose');

/**
 * Bulk inserts a batch of records into a MongoDB collection with a retry mechanism.
 * 
 * @param {mongoose.Model} model - The Mongoose model
 * @param {Array<Object>} records - Array of records to insert
 * @param {number} retries - Number of retries left
 * @param {number} delay - Base delay for exponential backoff in ms
 */
async function bulkInsertWithRetry(model, records, retries = 3, delay = 1000) {
  if (!records || records.length === 0) return;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Use insertMany with ordered: false so that if a single record fails (e.g. duplicate key),
      // the others in the batch still get inserted.
      await model.insertMany(records, { ordered: false });
      return; // Success, exit retry loop
    } catch (error) {
      // If error is just duplicate key errors, some might have succeeded.
      // We don't want to fail the whole batch.
      if (error.name === 'MongoBulkWriteError' || error.code === 11000) {
        // Some records failed due to duplicates, which is fine during re-migration
        return;
      }
      
      console.warn(`[WARNING] Attempt ${attempt} failed for bulk load into ${model.modelName}: ${error.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to load batch into ${model.modelName} after ${retries} attempts. Last error: ${error.message}`);
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}

module.exports = {
  bulkInsertWithRetry
};
