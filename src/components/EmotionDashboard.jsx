import React, { useState } from "react";

function EmotionDashboard() {

    const [text, setText] = useState("");
    const [emotion, setEmotion] = useState("");
    const [accuracy, setAccuracy] = useState("");

    const analyzeEmotion = async () => {

        const response = await fetch("http://localhost:5000/api/emotion/evaluate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        setEmotion(data.emotion);
        setAccuracy(data.accuracy);
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>AI Emotion Analysis</h2>

            <textarea
                rows="4"
                cols="50"
                placeholder="Enter text..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />

            <br /><br />

            <button onClick={analyzeEmotion}>
                Analyze Emotion
            </button>

            <br /><br />

            <div>
                <h3>Predicted Emotion: {emotion}</h3>
                <h3>Model Accuracy: {(accuracy * 100).toFixed(2)}%</h3>
            </div>
        </div>
    );
}

export default EmotionDashboard;