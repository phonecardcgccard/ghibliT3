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

// Debounce utility
function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

// Tab switching functionality
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Style strength slider
styleStrengthSlider.addEventListener('input', debounce(() => {
    styleStrengthValue.textContent = `${styleStrengthSlider.value}%`;
}, 300));

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
    if (styleStrengthSlider.value <= 0) {
        alert('Style strength must be greater than 0');
        return;
    }

    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    let prompt = '';
    let imageBase64 = null;

    if (activeTab === 'text') {
        prompt = document.getElementById('prompt').value.trim();
        if (!prompt) {
            alert('Please enter a prompt');
            return;
        }
        // Add default Ghibli style to the text prompt
        prompt = `${prompt}, Studio Ghibli style`;
    } else {
        if (!uploadedImage) {
            alert('Please upload an image');
            return;
        }

        imageBase64 = await getBase64FromFile(uploadedImage);
        prompt = document.getElementById('image-prompt').value.trim() || 'Studio Ghibli style';
    }

    resultPlaceholder.hidden = true;
    resultImage.hidden = true;
    loadingIndicator.hidden = false;
    generateBtn.disabled = true;
    downloadBtn.disabled = true;

    try {
        const result = await generateImage(prompt, imageBase64, styleStrengthSlider.value);

        if (result.success) {
            generatedImageUrl = result.imageUrl;
            resultImage.src = generatedImageUrl;
            resultImage.hidden = false;
            downloadBtn.disabled = false;
        } else {
            alert(`Error: ${result.error}`);
            resultPlaceholder.hidden = false;
        }
    } catch (error) {
        console.error('Error generating image:', error);
        alert('An error occurred while generating the image. Please try again.');
        resultPlaceholder.hidden = false;
    } finally {
        loadingIndicator.hidden = true;
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
        // Validate styleStrength
        if (styleStrength < 0 || styleStrength > 100) {
            throw new Error("Style strength must be between 0 and 100.");
        }

        // Construct the API endpoint and prompt
        const apiUrl = 'https://image.pollinations.ai/prompt/';
        const fullPrompt = `${prompt}, no logo, no watermark, no text`.trim();
        const encodedPrompt = encodeURIComponent(fullPrompt);

        if (imageBase64) {
            const params = new URLSearchParams();
            params.append('image', imageBase64);
            params.append('styleStrength', styleStrength / 100);

            const response = await fetch(`${apiUrl}${encodedPrompt}?nologo=true`, {
                method: 'POST',
                body: params,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Image-to-Image HTTP error: ${response.status} - ${errorText}`);
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            return { success: true, imageUrl };
        } else {
            const imageUrl = `${apiUrl}${encodedPrompt}?nologo=true`;
            const response = await fetch(imageUrl, { method: 'HEAD' });

            if (!response.ok) {
                throw new Error(`Text-to-Image HTTP error: ${response.status}`);
            }

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

