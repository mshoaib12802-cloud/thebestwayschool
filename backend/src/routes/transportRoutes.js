const express = require('express');
const router = express.Router();
const { protect, adminOnly, staffOnly, parentOnly } = require('../middlewares/authMiddleware');
const { getVehicles, addVehicle, updateVehicle, deleteVehicle, getRoutes, addRoute, updateRoute, deleteRoute, getStudentTransports, enrollStudentTransport, removeStudentTransport, getMyTransport } = require('../controllers/transportController');

router.get('/vehicles',                   protect, staffOnly, getVehicles);
router.post('/vehicles',                  protect, adminOnly, addVehicle);
router.put('/vehicles/:id',               protect, adminOnly, updateVehicle);
router.delete('/vehicles/:id',            protect, adminOnly, deleteVehicle);

router.get('/routes',                     protect, staffOnly, getRoutes);
router.post('/routes',                    protect, adminOnly, addRoute);
router.put('/routes/:id',                 protect, adminOnly, updateRoute);
router.delete('/routes/:id',              protect, adminOnly, deleteRoute);

router.get('/students',                   protect, staffOnly, getStudentTransports);
router.post('/students',                  protect, staffOnly, enrollStudentTransport);
router.delete('/students/:studentId',     protect, staffOnly, removeStudentTransport);

router.get('/child/:studentId',           protect, parentOnly, getMyTransport);

module.exports = router;
