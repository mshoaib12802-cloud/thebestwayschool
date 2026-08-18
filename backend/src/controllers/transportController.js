const Vehicle = require('../models/Vehicle');
const TransportRoute = require('../models/TransportRoute');
const StudentTransport = require('../models/StudentTransport');
const Student = require('../models/Student');

const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ registration_no: 1 });
    res.json(vehicles);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const addVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Registration number already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(vehicle);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getRoutes = async (req, res) => {
  try {
    const { academic_year_id } = req.query;
    const filter = { is_active: true };
    if (academic_year_id) filter.academic_year_id = academic_year_id;
    const routes = await TransportRoute.find(filter).populate('vehicle_id', 'registration_no driver_name capacity').sort({ name: 1 });
    res.json(routes);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const addRoute = async (req, res) => {
  try {
    const route = await TransportRoute.create(req.body);
    await route.populate('vehicle_id', 'registration_no driver_name');
    res.status(201).json(route);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const updateRoute = async (req, res) => {
  try {
    const route = await TransportRoute.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('vehicle_id', 'registration_no driver_name');
    res.json(route);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const deleteRoute = async (req, res) => {
  try {
    await TransportRoute.findByIdAndUpdate(req.params.id, { is_active: false });
    res.json({ message: 'Deleted' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getStudentTransports = async (req, res) => {
  try {
    const { route_id, academic_year_id } = req.query;
    const filter = {};
    if (route_id) filter.route_id = route_id;
    if (academic_year_id) filter.academic_year_id = academic_year_id;
    const records = await StudentTransport.find(filter)
      .populate('student_id', 'full_name roll_number')
      .populate('route_id', 'name');
    res.json(records);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const enrollStudentTransport = async (req, res) => {
  try {
    const { student_id, route_id, stop_name, monthly_fee, academic_year_id } = req.body;
    const record = await StudentTransport.findOneAndUpdate(
      { student_id },
      { route_id, stop_name, monthly_fee, academic_year_id, enrolled_by: req.user._id, is_active: true },
      { upsert: true, new: true }
    ).populate('student_id', 'full_name roll_number').populate('route_id', 'name');
    res.json(record);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const removeStudentTransport = async (req, res) => {
  try {
    await StudentTransport.findOneAndUpdate({ student_id: req.params.studentId }, { is_active: false });
    res.json({ message: 'Removed' });
  } catch { res.status(500).json({ message: 'Server error' }); }
};

const getMyTransport = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student || String(student.parent_id) !== String(req.user._id))
      return res.status(403).json({ message: 'Access denied' });
    const record = await StudentTransport.findOne({ student_id: req.params.studentId, is_active: true })
      .populate('route_id');
    res.json(record || null);
  } catch { res.status(500).json({ message: 'Server error' }); }
};

module.exports = {
  getVehicles, addVehicle, updateVehicle, deleteVehicle,
  getRoutes, addRoute, updateRoute, deleteRoute,
  getStudentTransports, enrollStudentTransport, removeStudentTransport, getMyTransport,
};
