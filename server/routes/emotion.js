const express = require("express");
const router = express.Router();

router.post("/evaluate", async (req, res) => {
    const { text } = req.body;

    // Dummy prediction for demo
    const predictedEmotion = "happy";

    // Dummy accuracy
    const accuracy = 0.87;

    res.json({
        emotion: predictedEmotion,
        accuracy: accuracy
    });
});

module.exports = router;