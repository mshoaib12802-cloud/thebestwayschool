const AcademicYear = require('../models/AcademicYear');

const getAcademicYears = async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ start_date: -1 });
    res.json(years);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addAcademicYear = async (req, res) => {
  try {
    const year = await AcademicYear.create(req.body);
    res.status(201).json(year);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateAcademicYear = async (req, res) => {
  try {
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!year) return res.status(404).json({ message: 'Academic year not found' });
    res.json(year);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteAcademicYear = async (req, res) => {
  try {
    const year = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!year) return res.status(404).json({ message: 'Academic year not found' });
    res.json({ message: 'Academic year deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const setCurrentYear = async (req, res) => {
  try {
    await AcademicYear.updateMany({}, { is_current: false });
    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      { is_current: true },
      { new: true }
    );
    if (!year) return res.status(404).json({ message: 'Academic year not found' });
    res.json(year);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAcademicYears, addAcademicYear, updateAcademicYear, deleteAcademicYear, setCurrentYear };
