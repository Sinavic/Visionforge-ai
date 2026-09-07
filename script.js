/* VisionForge AI - Real Generation Controller
   This file connects the existing VisionForge interface
   to our secure backend API.
*/

(function () {
    "use strict";

    function setupVisionForge() {
        const generateButton = document.getElementById("generate");

        if (!generateButton) {
            console.error("VisionForge: Generate button not found.");
            return;
        }

        /*
         * Remove the old demo click handler by replacing
         * the button with a clean copy.
         */
        const cleanButton = generateButton.cloneNode(true);
        generateButton.parentNode.replaceChild(cleanButton, generateButton);

        cleanButton.addEventListener("click", async function () {
            const promptElement = document.getElementById("prompt");
            const modeElement = document.querySelector(".tab.active");

            const prompt = promptElement
                ? promptElement.value.trim()
                : "";

            const mode = modeElement
                ? modeElement.dataset.mode
                : "text-image";

            if (!prompt) {
                alert("Please enter a description first.");
                return;
            }

            try {
                setGenerating(true);

                if (mode === "text-image") {
                    await generateTextToImage(prompt);
                }

                else if (mode === "text-video") {
                    await generateTextToVideo(prompt);
                }

                else if (mode === "image-image") {
                    await generateImageToImage(prompt);
                }

                else if (mode === "image-video") {
                    await generateImageToVideo(prompt);
                }

                else {
                    throw new Error("Unknown generation mode.");
                }

            } catch (error) {
                console.error(error);
                alert(
                    "Generation failed.\n\n" +
                    (error.message || "Please try again.")
                );
            } finally {
                setGenerating(false);
            }
        });
    }


    /* -----------------------------
       TEXT → IMAGE
    ----------------------------- */

    async function generateTextToImage(prompt) {
        const response = await fetch(
            "/api/generate-image?prompt=" +
            encodeURIComponent(prompt)
        );

        if (!response.ok) {
            throw new Error("The image server returned an error.");
        }

        const blob = await response.blob();

        showImage(blob);
    }


    /* -----------------------------
       TEXT → VIDEO
    ----------------------------- */

    async function generateTextToVideo(prompt) {
        const durationElement = document.getElementById("duration");

        const duration = durationElement
            ? durationElement.value
            : "5";

        const response = await fetch(
            "/api/generate-video?prompt=" +
            encodeURIComponent(prompt) +
            "&duration=" +
            encodeURIComponent(duration)
        );

        if (!response.ok) {
            throw new Error("The video server returned an error.");
        }

        const blob = await response.blob();

        showVideo(blob);
    }


    /* -----------------------------
       IMAGE → IMAGE
    ----------------------------- */

    async function generateImageToImage(prompt) {
        const imageInput = document.getElementById("imageInput");

        if (!imageInput || !imageInput.files.length) {
            throw new Error("Please upload an image first.");
        }

        const formData = new FormData();

        formData.append("image", imageInput.files[0]);
        formData.append("prompt", prompt);

        const response = await fetch(
            "/api/image-to-image",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error("The image editing server returned an error.");
        }

        const blob = await response.blob();

        showImage(blob);
    }


    /* -----------------------------
       IMAGE → VIDEO
    ----------------------------- */

    async function generateImageToVideo(prompt) {
        const imageInput = document.getElementById("imageInput");

        if (!imageInput || !imageInput.files.length) {
            throw new Error("Please upload an image first.");
        }

        const durationElement = document.getElementById("duration");

        const duration = durationElement
            ? durationElement.value
            : "5";

        const formData = new FormData();

        formData.append("image", imageInput.files[0]);
        formData.append("prompt", prompt);
        formData.append("duration", duration);

        const response = await fetch(
            "/api/image-to-video",
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error("The image-to-video server returned an error.");
        }

        const blob = await response.blob();

        showVideo(blob);
    }


    /* -----------------------------
       DISPLAY IMAGE
    ----------------------------- */

    function showImage(blob) {
        const image = document.getElementById("resultImage");
        const video = document.getElementById("resultVideo");
        const text = document.getElementById("resultText");
        const empty = document.getElementById("empty");
        const actions = document.getElementById("actions");

        const url = URL.createObjectURL(blob);

        if (image) {
            image.src = url;
            image.style.display = "block";
        }

        if (video) {
            video.style.display = "none";
        }

        if (text) {
            text.style.display = "none";
        }

        if (empty) {
            empty.style.display = "none";
        }

        if (actions) {
            actions.style.display = "flex";
        }

        window.visionForgeResult = {
            type: "image",
            url: url,
            blob: blob
        };
    }


    /* -----------------------------
       DISPLAY VIDEO
    ----------------------------- */

    function showVideo(blob) {
        const image = document.getElementById("resultImage");
        const video = document.getElementById("resultVideo");
        const text = document.getElementById("resultText");
        const empty = document.getElementById("empty");
        const actions = document.getElementById("actions");

        const url = URL.createObjectURL(blob);

        if (image) {
            image.style.display = "none";
        }

        if (video) {
            video.src = url;
            video.style.display = "block";
            video.controls = true;
            video.autoplay = false;
        }

        if (text) {
            text.style.display = "none";
        }

        if (empty) {
            empty.style.display = "none";
        }

        if (actions) {
            actions.style.display = "flex";
        }

        window.visionForgeResult = {
            type: "video",
            url: url,
            blob: blob
        };
    }


    /* -----------------------------
       GENERATION UI
    ----------------------------- */

    function setGenerating(isGenerating) {
        const button = document.getElementById("generate");
        const progress = document.getElementById("progress");
        const progressFill = document.getElementById("progressFill");
        const progressText = document.getElementById("progressText");

        if (isGenerating) {
            if (button) {
                button.disabled = true;
                button.textContent = "Generating...";
            }

            if (progress) {
                progress.style.display = "block";
            }

            if (progressFill) {
                progressFill.style.width = "30%";
            }

            if (progressText) {
                progressText.textContent = "AI is generating your creation...";
            }

        } else {
            if (button) {
                button.disabled = false;
                button.textContent = "Generate";
            }

            if (progressFill) {
                progressFill.style.width = "100%";
            }

            if (progressText) {
                progressText.textContent = "Generation complete";
            }
        }
    }


    /* -----------------------------
       DOWNLOAD
    ----------------------------- */

    const downloadButton = document.getElementById("downloadBtn");

    if (downloadButton) {
        downloadButton.addEventListener("click", function () {

            const result = window.visionForgeResult;

            if (!result) {
                alert("Generate something first.");
                return;
            }

            const link = document.createElement("a");

            link.href = result.url;

            if (result.type === "video") {
                link.download = "visionforge-ai-video.mp4";
            } else {
                link.download = "visionforge-ai-image.png";
            }

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }


    /*
     * Wait until the existing VisionForge page has loaded.
     */
    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            setupVisionForge
        );
    } else {
        setupVisionForge();
    }

})();
