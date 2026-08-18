const Document = require('../models/Document');
const audit    = require('../utils/auditLogger');
const path     = require('path');
const fs       = require('fs');

const getDocuments = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    if (!entity_type || !entity_id) return res.status(400).json({ message: 'entity_type and entity_id required' });
    const docs = await Document.find({ entity_type, entity_id }).populate('uploaded_by', 'name').sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { entity_type, entity_id, title, category, notes } = req.body;
    if (!entity_type || !entity_id || !title) return res.status(400).json({ message: 'entity_type, entity_id and title are required' });

    const doc = await Document.create({
      entity_type,
      entity_id,
      title,
      category: category || 'other',
      file_url:  `/uploads/documents/${req.file.filename}`,
      file_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      notes:     notes || '',
      uploaded_by: req.user._id,
    });

    await audit({ req, action: 'create', module: 'Documents', entity_type, entity_id, entity_label: title, description: `Document uploaded: ${title}` });
    res.status(201).json(doc);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Delete physical file
    const filePath = path.join(__dirname, '../../uploads/documents', path.basename(doc.file_url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await doc.deleteOne();
    await audit({ req, action: 'delete', module: 'Documents', entity_label: doc.title, description: `Document deleted: ${doc.title}` });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getDocuments, uploadDocument, deleteDocument };
