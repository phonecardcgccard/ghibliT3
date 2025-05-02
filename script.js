// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const uploadArea = document.getElementById('upload-area');
const imageUpload = document.getElementById('image-upload');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image');
const generateBtn = document.getElementById('generate-btn');
const resultContainer = document.getElementById('result-container');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultImage = document.getElementById('result-image');
const loadingIndicator = document.getElementById('loading-indicator');
const downloadBtn = document.getElementById('download-btn');
const styleStrengthSlider = document.getElementById('style-strength');
const styleStrengthValue = document.getElementById('style-strength-value');

// Variables
let uploadedImage = null;
let generatedImageUrl = null;
let generatedImageIsObjectUrl = false;

// Tab switching functionality
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
        // Reset output area
        resultPlaceholder.hidden = false;
        resultImage.hidden = true;
        resultImage.src = '';
        loadingIndicator.hidden = true;
        downloadBtn.disabled = true;
    });
});

// Style strength slider
styleStrengthSlider.addEventListener('input', () => {
    styleStrengthValue.textContent = `${styleStrengthSlider.value}%`;
});

// Image upload functionality
uploadArea.addEventListener('click', () => {
    imageUpload.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    if (e.dataTransfer.files.length) {
        handleImageUpload(e.dataTransfer.files[0]);
    }
});

imageUpload.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleImageUpload(e.target.files[0]);
    }
});

removeImageBtn.addEventListener('click', () => {
    uploadedImage = null;
    imagePreview.src = '';
    previewContainer.hidden = true;
    uploadArea.hidden = false;
    imageUpload.value = '';
});

// Function to handle image upload
function handleImageUpload(file) {
    if (!file.type.match('image.*')) {
        alert('Please upload an image file');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5 MB');
        return;
    }

    uploadedImage = file;
    const reader = new FileReader();

    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewContainer.hidden = false;
        uploadArea.hidden = true;
    };

    reader.onerror = () => {
        alert('Error reading file. Please try again.');
    };

    reader.readAsDataURL(file);
}

// Generate image functionality
generateBtn.addEventListener('click', async () => {
    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    let prompt = '';
    let imageBase64 = null;

    // Release previous ObjectURL if any
    if (generatedImageIsObjectUrl && generatedImageUrl) {
        URL.revokeObjectURL(generatedImageUrl);
        generatedImageIsObjectUrl = false;
    }
    generatedImageUrl = null;
    resultImage.src = '';
    resultImage.hidden = true;
    resultPlaceholder.hidden = true;
    loadingIndicator.hidden = false;
    generateBtn.disabled = true;
    downloadBtn.disabled = true;

    if (activeTab === 'text') {
        prompt = document.getElementById('prompt').value.trim();
        if (!prompt) {
            alert('Please enter a prompt');
            loadingIndicator.hidden = true;
            resultPlaceholder.hidden = false;
            generateBtn.disabled = false;
            return;
        }
        prompt = `${prompt}, Studio Ghibli style`;
    } else { // Image tab
        if (!uploadedImage) {
            alert('Please upload an image');
            loadingIndicator.hidden = true;
            resultPlaceholder.hidden = false;
            generateBtn.disabled = false;
            return;
        }
        imageBase64 = await getBase64FromFile(uploadedImage);
        prompt = document.getElementById('image-prompt').value.trim() || 'Studio Ghibli style';
    }

    try {
        const result = await generateImage(prompt, imageBase64, styleStrengthSlider.value);

        if (result.success) {
            generatedImageUrl = result.imageUrl;
            generatedImageIsObjectUrl = !!imageBase64;
            resultImage.onload = () => {
                loadingIndicator.hidden = true;
                resultImage.hidden = false;
                downloadBtn.disabled = false;
            };
            resultImage.onerror = () => {
                loadingIndicator.hidden = true;
                resultImage.hidden = true;
                resultPlaceholder.hidden = false;
                alert('Failed to load generated image.');
            };
            resultImage.src = generatedImageUrl;
            console.log("图片生成URL：", generatedImageUrl);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error generating image:', error);
        alert('An error occurred while generating the image. Please try again.');
        loadingIndicator.hidden = true;
        resultPlaceholder.hidden = false;
    } finally {
        generateBtn.disabled = false;
    }
});

// Function to get base64 from file
function getBase64FromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// Function to generate image using Pollinations.ai API
async function generateImage(prompt, imageBase64 = null, styleStrength = 75) {
    try {
        const apiUrl = 'https://image.pollinations.ai/prompt/';
        const fullPrompt = `${prompt}, no logo, no watermark, no text`.trim();
        const encodedPrompt = encodeURIComponent(fullPrompt);

        if (imageBase64) {
            // base64 → Blob
            function base64ToBlob(base64, mime = "image/png") {
                const byteString = atob(base64);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                return new Blob([ab], { type: mime });
            }
            const blob = base64ToBlob(imageBase64, "image/png");

            // Use FormData for multipart upload
            const formData = new FormData();
            formData.append('image', blob, 'upload.png');
            formData.append('styleStrength', styleStrength / 100);

            const response = await fetch(`${apiUrl}${encodedPrompt}?nologo=true&t=${Date.now()}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Image-to-Image HTTP error: ${response.status} - ${errorText}`);
            }

            const resultBlob = await response.blob();
            const imageUrl = URL.createObjectURL(resultBlob);
            return { success: true, imageUrl };
        } else {
            // Text to image, add cache-buster
            const imageUrl = `${apiUrl}${encodedPrompt}?nologo=true&t=${Date.now()}`;
            return { success: true, imageUrl };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Download functionality
downloadBtn.addEventListener('click', () => {
    if (!generatedImageUrl) return;

    const a = document.createElement('a');
    a.href = generatedImageUrl;
    a.download = `ghibli-style-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});
