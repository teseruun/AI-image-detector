import os
from pathlib import Path

import numpy as np
from flask import Flask, jsonify, render_template, request
from PIL import Image
import tensorflow as tf


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "efficientnetv2_ai_detector.keras"

app = Flask(__name__)
model = tf.keras.models.load_model(MODEL_PATH, compile=False)


def model_input_size():
    shape = model.input_shape
    height = shape[1] if len(shape) > 2 and isinstance(shape[1], int) else 224
    width = shape[2] if len(shape) > 2 and isinstance(shape[2], int) else 224
    return width, height


def predict_image(image):
    width, height = model_input_size()
    image = image.convert("RGB").resize((width, height))
    pixels = np.asarray(image, dtype=np.float32) / 255.0
    output = np.asarray(model.predict(np.expand_dims(pixels, axis=0), verbose=0)).squeeze()

    if output.ndim == 0:
        ai_probability = float(output)
        if not 0 <= ai_probability <= 1:
            ai_probability = float(tf.sigmoid(output))
    elif output.size == 1:
        ai_probability = float(output.flat[0])
        if not 0 <= ai_probability <= 1:
            ai_probability = float(tf.sigmoid(output.flat[0]))
    else:
        probabilities = tf.nn.softmax(output).numpy()
        ai_probability = float(probabilities[-1])

    ai_probability = float(np.clip(ai_probability, 0, 1))
    is_ai = ai_probability >= 0.5
    confidence = ai_probability if is_ai else 1 - ai_probability
    return {
        "label": "AI-generated" if is_ai else "Likely real",
        "shortLabel": "AI" if is_ai else "REAL",
        "isAi": is_ai,
        "aiProbability": round(ai_probability * 100, 1),
        "confidence": round(confidence * 100, 1),
    }


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_PATH.name})


@app.post("/predict")
def predict():
    image_file = request.files.get("image")
    if not image_file or not image_file.filename:
        return jsonify({"error": "Choose an image to analyze."}), 400

    try:
        image = Image.open(image_file)
        return jsonify(predict_image(image))
    except (OSError, ValueError) as error:
        return jsonify({"error": f"That file could not be analyzed: {error}"}), 400
    except Exception:
        app.logger.exception("Image prediction failed")
        return jsonify({"error": "The image could not be analyzed right now. Please try again."}), 500


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=int(os.environ.get("PORT", "5000")))
