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

// Tab switching functionality
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`${tabId}-tab`).classList.add('active');
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
    
    uploadedImage = file;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewContainer.hidden = false;
        uploadArea.hidden = true;
    };
    
    reader.readAsDataURL(file);
}

// Generate image functionality
generateBtn.addEventListener('click', async () => {
    const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
    let prompt = '';
    let imageBase64 = null;
    
    if (activeTab === 'text') {
        prompt = document.getElementById('prompt').value.trim();
        if (!prompt) {
            alert('Please enter a prompt');
            return;
        }
    } else { // Image tab
        if (!uploadedImage) {
            alert('Please upload an image');
            return;
        }
        
        // Get base64 of uploaded image
        imageBase64 = await getBase64FromFile(uploadedImage);
        prompt = document.getElementById('image-prompt').value.trim() || 'Convert to Studio Ghibli style';
    }
    
    // Show loading indicator
    resultPlaceholder.hidden = true;
    resultImage.hidden = true;
    loadingIndicator.hidden = false;
    generateBtn.disabled = true;
    downloadBtn.disabled = true;
    
    try {
        // Generate image using Pollinations.ai API
        const result = await generateImage(prompt, imageBase64, styleStrengthSlider.value);
        
        if (result.success) {
            // Display the generated image
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
            // Remove the data:image/xxx;base64, prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// Function to generate image using Pollinations.ai API
async function generateImage(prompt, imageBase64 = null, styleStrength = 75) {
    try {
        // Construct the API request based on whether it's text-to-image or image-to-image
        const apiUrl = 'https://image.pollinations.ai/prompt/';
        
        // Add 'no logo' to the prompt to remove watermark
        let fullPrompt = `${prompt}, style of Studio Ghibli, no logo, no watermark, no text`;
        
        // Encode the prompt for URL
        const encodedPrompt = encodeURIComponent(fullPrompt);
        
        if (imageBase64) {
            // Image-to-image generation
            // For image-to-image, we need to include the image data and style strength
            const params = new URLSearchParams();
            params.append('image', imageBase64);
            params.append('styleStrength', styleStrength / 100); // Convert percentage to 0-1 range
            
            // Make a POST request to the Pollinations API
            // Add nologo parameter to ensure watermark removal
            const response = await fetch(`${apiUrl}${encodedPrompt}?nologo=true`, {
                method: 'POST',
                body: params
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            
            return {
                success: true,
                imageUrl: imageUrl
            };
        } else {
            // Text-to-image generation (simpler, just needs the prompt)
            // For Pollinations.ai, we can directly use the URL with the encoded prompt
            // Add 'nologo=true' parameter to ensure watermark removal
            const imageUrl = `${apiUrl}${encodedPrompt}?nologo=true`;
            
            // Verify the image is accessible
            const response = await fetch(imageUrl, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return {
                success: true,
                imageUrl: imageUrl
            };
        }
    } catch (error) {
        console.error('Error in generateImage:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Download functionality
downloadBtn.addEventListener('click', () => {
    if (!generatedImageUrl) return;
    
    // Create a temporary link element
    const a = document.createElement('a');
    a.href = generatedImageUrl;
    a.download = `ghibli-style-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});