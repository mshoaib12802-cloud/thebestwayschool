const Period = require('../models/Period');

const getPeriods = async (req, res) => {
  try {
    const periods = await Period.find({ is_active: true }).sort({ order: 1 });
    res.json(periods);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getAllPeriods = async (req, res) => {
  try {
    const periods = await Period.find().sort({ order: 1 });
    res.json(periods);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const addPeriod = async (req, res) => {
  try {
    const { name, start_time, end_time, is_break } = req.body;
    const count = await Period.countDocuments();
    const period = await Period.create({
      name, start_time, end_time,
      is_break: is_break || false,
      order: req.body.order ?? count + 1,
    });
    res.status(201).json(period);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const updatePeriod = async (req, res) => {
  try {
    const period = await Period.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!period) return res.status(404).json({ message: 'Period not found' });
    res.json(period);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const deletePeriod = async (req, res) => {
  try {
    await Period.findByIdAndDelete(req.params.id);
    res.json({ message: 'Period deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const reorderPeriods = async (req, res) => {
  try {
    // req.body.ordered_ids: array of period IDs in the desired order
    const { ordered_ids } = req.body;
    await Promise.all(ordered_ids.map((id, idx) =>
      Period.findByIdAndUpdate(id, { order: idx + 1 })
    ));
    const periods = await Period.find().sort({ order: 1 });
    res.json(periods);
  } catch (err) { res.status(400).json({ message: err.message }); }
};

module.exports = { getPeriods, getAllPeriods, addPeriod, updatePeriod, deletePeriod, reorderPeriods };
