import os
from urllib.parse import quote

import requests
from flask import Flask, request, send_from_directory, Response, jsonify

app = Flask(__name__)

POLLINATIONS_URL = "https://gen.pollinations.ai"
API_KEY = os.environ.get("POLLINATIONS_API_KEY")


def auth_headers():
    return {
        "Authorization": f"Bearer {API_KEY}"
    }


def check_api_key():
    if not API_KEY:
        return jsonify({
            "error": "POLLINATIONS_API_KEY is not configured on the server."
        }), 500

    return None


@app.route("/")
def home():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def files(filename):
    return send_from_directory(".", filename)


# ---------------------------------------
# TEXT → IMAGE
# ---------------------------------------

@app.route("/api/generate-image")
def generate_image():

    error = check_api_key()
    if error:
        return error

    prompt = request.args.get("prompt", "").strip()

    if not prompt:
        return jsonify({
            "error": "A prompt is required."
        }), 400

    model = request.args.get("model", "flux")

    url = (
        f"{POLLINATIONS_URL}/image/"
        f"{quote(prompt, safe='')}"
        f"?model={quote(model)}"
    )

    try:
        response = requests.get(
            url,
            headers=auth_headers(),
            timeout=180
        )

        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get(
                "Content-Type",
                "image/jpeg"
            )
        )

    except requests.RequestException as e:

        return jsonify({
            "error": f"Image generation failed: {str(e)}"
        }), 502


# ---------------------------------------
# TEXT → VIDEO
# ---------------------------------------

@app.route("/api/generate-video")
def generate_video():

    error = check_api_key()
    if error:
        return error

    prompt = request.args.get("prompt", "").strip()

    if not prompt:
        return jsonify({
            "error": "A prompt is required."
        }), 400

    duration = request.args.get("duration", "5")

    model = request.args.get("model", "veo")

    url = (
        f"{POLLINATIONS_URL}/video/"
        f"{quote(prompt, safe='')}"
        f"?model={quote(model)}"
        f"&duration={quote(str(duration))}"
    )

    try:
        response = requests.get(
            url,
            headers=auth_headers(),
            timeout=600
        )

        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get(
                "Content-Type",
                "video/mp4"
            )
        )

    except requests.RequestException as e:

        return jsonify({
            "error": f"Video generation failed: {str(e)}"
        }), 502


# ---------------------------------------
# IMAGE → IMAGE
# ---------------------------------------

@app.route("/api/image-to-image", methods=["POST"])
def image_to_image():

    error = check_api_key()
    if error:
        return error

    image = request.files.get("image")
    prompt = request.form.get("prompt", "").strip()

    if not image:
        return jsonify({
            "error": "Please upload an image."
        }), 400

    if not prompt:
        return jsonify({
            "error": "Please enter an editing prompt."
        }), 400

    try:

        files = {
            "image": (
                image.filename,
                image.stream,
                image.mimetype
            )
        }

        data = {
            "prompt": prompt,
            "model": "kontext",
            "size": "1024x1024"
        }

        response = requests.post(
            f"{POLLINATIONS_URL}/v1/images/edits",
            headers=auth_headers(),
            files=files,
            data=data,
            timeout=300
        )

        content_type = response.headers.get(
            "Content-Type",
            ""
        )

        # Pollinations may return JSON containing the
        # generated image rather than raw image bytes.
        if "application/json" in content_type:

            result = response.json()

            if "data" in result and result["data"]:

                item = result["data"][0]

                if "b64_json" in item:

                    import base64

                    image_bytes = base64.b64decode(
                        item["b64_json"]
                    )

                    return Response(
                        image_bytes,
                        status=200,
                        content_type="image/png"
                    )

                if "url" in item:

                    generated = requests.get(
                        item["url"],
                        timeout=180
                    )

                    return Response(
                        generated.content,
                        status=generated.status_code,
                        content_type=generated.headers.get(
                            "Content-Type",
                            "image/png"
                        )
                    )

        return Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get(
                "Content-Type",
                "image/png"
            )
        )

    except Exception as e:

        return jsonify({
            "error": f"Image editing failed: {str(e)}"
        }), 502


# ---------------------------------------
# IMAGE → VIDEO
# ---------------------------------------

@app.route("/api/image-to-video", methods=["POST"])
def image_to_video():

    error = check_api_key()
    if error:
        return error

    image = request.files.get("image")
    prompt = request.form.get("prompt", "").strip()
    duration = request.form.get("duration", "5")

    if not image:
        return jsonify({
            "error": "Please upload an image."
        }), 400

    if not prompt:
        return jsonify({
            "error": "Please enter a video prompt."
        }), 400

    return jsonify({
        "error": (
            "Image-to-video requires a publicly accessible "
            "reference-image URL. The VisionForge upload-to-video "
            "connector will be enabled in the next deployment step."
        )
    }), 501


# ---------------------------------------
# HEALTH CHECK
# ---------------------------------------

@app.route("/api/health")
def health():

    return jsonify({
        "status": "online",
        "visionforge": "VisionForge AI",
        "pollinations_configured": bool(API_KEY)
    })


# ---------------------------------------
# START SERVER
# ---------------------------------------

if __name__ == "__main__":

    port = int(
        os.environ.get("PORT", 5000)
    )

    app.run(
        host="0.0.0.0",
        port=port
    )
