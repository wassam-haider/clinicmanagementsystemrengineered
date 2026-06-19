const Patient = require('../models/patient');
const Doctor = require('../models/doctor');
const Appointment = require('../models/appointment');
const Prescription = require('../models/prescription');

/**
 * Generates the next sequential ID for a given model.
 * Handles mixed-padding legacy strings (e.g. P501 vs P50000) using aggregation.
 * 
 * @param {string} prefix - The ID prefix (e.g., 'P', 'D', 'A', 'PR')
 * @param {mongoose.Model} model - The Mongoose model to query
 * @param {string} idField - The name of the ID field in the model schema
 * @returns {Promise<string>} The next formatted ID (e.g. P50002)
 */
async function getNextId(prefix, model, idField) {
  try {
    const matchRegex = new RegExp(`^${prefix}\\d+$`);
    
    const result = await model.aggregate([
      {
        $match: {
          [idField]: { $regex: matchRegex }
        }
      },
      {
        $project: {
          numericPart: {
            $toInt: {
              $substrCP: [
                `$${idField}`,
                prefix.length,
                10 // Max length of digits to slice
              ]
            }
          }
        }
      },
      {
        $sort: { numericPart: -1 }
      },
      {
        $limit: 1
      }
    ]).exec();

    let nextNum = 1;
    if (result && result.length > 0 && result[0].numericPart !== undefined) {
      nextNum = result[0].numericPart + 1;
    }

    // Format with leading zeroes (5 digits total)
    const formattedNum = String(nextNum).padStart(5, '0');
    return `${prefix}${formattedNum}`;
  } catch (error) {
    console.error('Error generating ID:', error);
    throw error;
  }
}

module.exports = {
  getNextId
};
