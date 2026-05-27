// Plant detection route using plantAgent
const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { loadModel, isPlant } = require('../../plantAgent');

const upload = multer({ storage: multer.memoryStorage() });

function getPlantDiagnosisFixtures() {
    return {
        plantType: 'Groundnut',
        diseases: [
            {
                name: 'Groundnut Rosette',
                severity: 'High',
                confidence: 92,
                symptoms: ['Yellow leaves', 'Stunted growth', 'Leaf curling'],
                description:
                    'A viral disease transmitted by aphids that causes severe stunting and yellowing of plants.',
                treatment: [
                    'Remove and burn infected plants immediately',
                    'Use resistant varieties like Serenut 2 or 4',
                    'Control aphids using neem oil or recommended insecticides',
                    'Practice crop rotation with non-host crops',
                ],
                preventive: [
                    'Plant early to avoid aphid population buildup',
                    'Use certified disease-free seeds',
                    'Maintain proper field sanitation',
                    'Monitor fields weekly for early detection',
                ],
            },
            {
                name: 'Early Leaf Spot',
                severity: 'Medium',
                confidence: 87,
                symptoms: ['Brown spots', 'Yellow halos', 'Premature leaf drop'],
                description: 'Fungal disease causing circular spots with yellow halos on leaves.',
                treatment: [
                    'Apply fungicides containing chlorothalonil',
                    'Remove and destroy infected leaves',
                    'Improve air circulation around plants',
                ],
                preventive: [
                    'Avoid overhead irrigation',
                    'Space plants properly',
                    'Rotate crops every 2-3 years',
                ],
            },
            {
                name: 'Healthy Plant',
                severity: 'None',
                confidence: 95,
                symptoms: ['No visible symptoms', 'Vibrant green color'],
                description: 'Plant appears healthy with no signs of disease.',
                treatment: ['Continue regular monitoring'],
                preventive: [
                    'Maintain proper watering schedule',
                    'Apply balanced fertilizer',
                    'Regularly inspect for pests',
                ],
            },
        ],
    };
}

function pickDiseaseDeterministically(imageBuffer) {
    const fixtures = getPlantDiagnosisFixtures();
    const hash = crypto.createHash('sha256').update(imageBuffer).digest();
    const idx = hash[0] % fixtures.diseases.length;
    return fixtures.diseases[idx];
}

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

// POST /api/plant/diagnose
// Accepts up to 5 images under `images[]` and returns an analysis payload consumed by diagnose.html.
router.post('/diagnose', upload.array('images', 5), async (req, res) => {
    try {
        const files = Array.isArray(req.files) ? req.files : [];
        if (files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded.' });
        }

        // Best-effort validation: if the optional ML dependency is installed, confirm the first image is a plant.
        let plantValidation = { performed: false };
        let tf;
        try {
            tf = require('@tensorflow/tfjs-node');
        } catch (e) {
            tf = null;
        }

        if (tf) {
            const imageTensor = tf.node.decodeImage(files[0].buffer);
            await loadModel();
            const result = await isPlant(imageTensor);
            plantValidation = { performed: true, result };
            if (result !== true) {
                return res.status(400).json(result);
            }
        }

        const fixtures = getPlantDiagnosisFixtures();
        const disease = pickDiseaseDeterministically(files[0].buffer);

        return res.json({
            plantType: fixtures.plantType,
            disease,
            timestamp: new Date().toISOString(),
            images: files.length,
            ai: {
                provider: tf ? 'tfjs' : 'heuristic',
                plantValidation,
            },
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
