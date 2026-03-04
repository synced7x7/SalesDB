const express = require('express');
const router = express.Router();
const dataManagementController = require('../controllers/dataManagementController');

// Get list of all tables
router.get('/tables', dataManagementController.getTables);

// Get schema for a specific table
router.get('/schema/:tableName', dataManagementController.getTableSchema);

// Insert a single record
router.post('/insert/:tableName', dataManagementController.insertSingleRecord);

// Bulk insert records
router.post('/bulk-insert/:tableName', dataManagementController.bulkInsertRecords);

module.exports = router;
