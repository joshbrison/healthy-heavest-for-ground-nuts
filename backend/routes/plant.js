// Plant detection route using plantAgent
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { loadModel, isPlant } = require('../../plantAgent');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/plant/check
router.post('/check', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded.' });
        }

        let tf;
        try {
            tf = require('@tensorflow/tfjs-node');
        } catch (e) {
            return res.status(501).json({
                error: 'Plant detection is not available because the optional ML dependency is not installed.',
                hint: 'Run `npm install` (or `npm install --omit=optional` to skip ML).',
            });
        }

        const imageBuffer = req.file.buffer;
        const imageTensor = tf.node.decodeImage(imageBuffer);
        await loadModel();
        const result = await isPlant(imageTensor);
        if (result === true) {
            return res.json({ success: true, message: 'Image is a plant.' });
        } else {
            return res.status(400).json({ error: 'This system was only designed to support plants only. Please upload another photo.' });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
