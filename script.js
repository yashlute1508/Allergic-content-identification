// Constants and configurations
const CONFIG = {
    STORAGE_KEY: 'allergens',
    TOUCH_DELAY: 300,
    SCROLL_DELAY: 200,
    SCROLL_OFFSET: 10,
    VIBRATION_DURATION: 200,
    DEBOUNCE_DELAY: 250
};

// Initialize allergens from localStorage with error handling
let allergens = [];
try {
    const storedAllergens = localStorage.getItem(CONFIG.STORAGE_KEY);
    allergens = storedAllergens ? JSON.parse(storedAllergens) : [];
} catch (error) {
    console.error('Error loading allergens:', error);
    // Fallback to empty array already set
}

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Improve mobile touch handling with better event delegation
document.addEventListener('touchstart', function(event) {
    const target = event.target;
    if (target.matches('button, input, textarea')) {
        target.focus();
    }
}, { passive: true });

// Prevent zoom on double tap but allow pinch zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= CONFIG.TOUCH_DELAY) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Add touch feedback with event delegation
document.addEventListener('touchstart', function(event) {
    const target = event.target;
    if (target.matches('button')) {
        target.style.transform = 'scale(0.95)';
    }
}, { passive: true });

document.addEventListener('touchend', function(event) {
    const target = event.target;
    if (target.matches('button')) {
        target.style.transform = 'scale(1)';
    }
}, { passive: true });

// Handle mobile keyboard issues with debouncing
const newAllergenInput = document.getElementById('newAllergen');
if (newAllergenInput) {
    newAllergenInput.addEventListener('focus', debounce(function() {
        window.scrollTo({
            top: newAllergenInput.offsetTop - CONFIG.SCROLL_OFFSET,
            behavior: 'smooth'
        });
    }, CONFIG.SCROLL_DELAY));
}

// Render initial allergen list
renderAllergens();

// Allergen management functions
function sanitizeAllergen(allergen) {
    return allergen.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '');
}

function saveAllergens() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(allergens));
    } catch (error) {
        console.error('Error saving allergens:', error);
        alert('Failed to save allergens. Please check your browser settings.');
    }
}

function renderAllergens() {
    const list = document.getElementById('allergenList');
    if (!list) return;

    const allergenItems = allergens.map(allergen => {
        const sanitizedAllergen = sanitizeAllergen(allergen);
        return `
            <div class="allergen-item" role="listitem">
                <span class="allergen-name">${sanitizedAllergen}</span>
                <button 
                    class="remove-allergen" 
                    onclick="removeAllergen('${sanitizedAllergen}')"
                    aria-label="Remove ${sanitizedAllergen}"
                    type="button">
                    <span aria-hidden="true">×</span> Remove
                </button>
            </div>
        `;
    }).join('');

    list.innerHTML = allergenItems || '<p class="no-allergens">No allergens added yet</p>';
    saveAllergens();
}

function addAllergen() {
    const input = document.getElementById('newAllergen');
    if (!input) return;

    const allergen = sanitizeAllergen(input.value);
    
    if (!allergen) {
        alert('Please enter a valid allergen name');
        return;
    }

    if (allergens.includes(allergen)) {
        alert('This allergen is already in your list');
        return;
    }

    try {
        allergens.push(allergen);
        renderAllergens();
        input.value = '';
        input.blur(); // Hide mobile keyboard after adding

        // Provide feedback
        const result = document.getElementById('result');
        if (result) {
            result.className = 'success';
            result.textContent = `Added ${allergen} to your allergen list`;
            result.style.display = 'block';
            setTimeout(() => result.style.display = 'none', 3000);
        }
    } catch (error) {
        console.error('Error adding allergen:', error);
        alert('Failed to add allergen. Please try again.');
    }
}

function removeAllergen(allergen) {
    try {
        allergens = allergens.filter(a => a !== allergen);
        renderAllergens();

        // Provide feedback
        const result = document.getElementById('result');
        if (result) {
            result.className = 'success';
            result.textContent = `Removed ${allergen} from your allergen list`;
            result.style.display = 'block';
            setTimeout(() => result.style.display = 'none', 3000);
        }
    } catch (error) {
        console.error('Error removing allergen:', error);
        alert('Failed to remove allergen. Please try again.');
    }
}

function checkIngredients() {
    const ingredientsTextarea = document.getElementById('ingredients');
    const result = document.getElementById('result');
    
    if (!ingredientsTextarea || !result) return;

    const ingredientText = ingredientsTextarea.value.toLowerCase();
    if (!ingredientText.trim()) {
        result.className = 'warning';
        result.textContent = 'Please enter ingredients to check';
        result.style.display = 'block';
        return;
    }

    try {
        // Split ingredients and clean them
        const ingredients = ingredientText
            .split(',')
            .map(i => i.trim())
            .filter(i => i.length > 0);

        // Check for allergens with more accurate matching
        const foundAllergens = allergens.filter(allergen => 
            ingredients.some(ingredient => 
                ingredient.includes(allergen) || 
                ingredient === allergen ||
                ingredient.startsWith(allergen + ' ') ||
                ingredient.endsWith(' ' + allergen)
            )
        );

        result.style.display = 'block';
        
        if (foundAllergens.length > 0) {
            result.className = 'warning';
            result.innerHTML = `⚠️ Warning: Contains allergens: ${foundAllergens.join(', ')}`;
            // Vibrate on mobile if allergens found
            if (navigator.vibrate) {
                navigator.vibrate(CONFIG.VIBRATION_DURATION);
            }
        } else {
            result.className = 'safe';
            result.innerHTML = '✅ No known allergens detected';
        }
    } catch (error) {
        console.error('Error checking ingredients:', error);
        result.className = 'error';
        result.textContent = 'Error checking ingredients. Please try again.';
    }

    // Hide mobile keyboard after checking
    ingredientsTextarea.blur();
}

// Profile management functions
function exportProfile() {
    try {
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `allergy-profile-${timestamp}.json`;
        const dataStr = JSON.stringify({ 
            allergens, 
            exportDate: new Date().toISOString(),
            version: '1.0'
        }, null, 2);

        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        // Show success message
        const result = document.getElementById('result');
        if (result) {
            result.className = 'success';
            result.textContent = 'Profile exported successfully';
            result.style.display = 'block';
            setTimeout(() => result.style.display = 'none', 3000);
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export profile. Please try again.');
    }
}

function importProfile() {
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.onchange = async (e) => {
            try {
                const file = e.target.files?.[0];
                if (!file) return;

                if (file.size > 1024 * 1024) {
                    throw new Error('File size too large. Please use a file under 1MB.');
                }

                const text = await file.text();
                const data = JSON.parse(text);

                // Validate imported data
                if (!data.allergens || !Array.isArray(data.allergens)) {
                    throw new Error('Invalid profile format');
                }

                // Sanitize and deduplicate allergens
                const importedAllergens = data.allergens
                    .map(a => sanitizeAllergen(a))
                    .filter(a => a && !allergens.includes(a));

                if (importedAllergens.length === 0) {
                    alert('No new allergens found in the imported profile.');
                    return;
                }

                allergens = [...allergens, ...importedAllergens];
                renderAllergens();

                // Show success message
                const result = document.getElementById('result');
                if (result) {
                    result.className = 'success';
                    result.textContent = `Imported ${importedAllergens.length} new allergen(s)`;
                    result.style.display = 'block';
                    setTimeout(() => result.style.display = 'none', 3000);
                }
            } catch (error) {
                console.error('Import error:', error);
                alert(error.message || 'Failed to import profile. Please ensure the file is a valid JSON export.');
            } finally {
                // Clean up
                document.body.removeChild(input);
            }
        };

        document.body.appendChild(input);
        input.click();
    } catch (error) {
        console.error('Import setup error:', error);
        alert('Failed to start import. Please try again.');
    }
}

// Camera handling and OCR functions
const CAMERA_CONFIG = {
    CONSTRAINTS: {
        video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    },
    OCR_SETTINGS: {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789,.()%-_:;',
        tessedit_pageseg_mode: '3',  // Fully automatic page segmentation
        preserve_interword_spaces: '1',
        tessedit_ocr_engine_mode: '3',  // Default + LSTM for better accuracy
        tessedit_enable_dict_correction: '1',
        textord_heavy_nr: '1',  // Heavy noise removal
        textord_min_linesize: '2.5',  // Minimum text size to detect
        language_model_penalty_non_dict_word: '0.5',  // More lenient with non-dictionary words
        language_model_penalty_non_freq_dict_word: '0.5',
        tessedit_create_txt: '1',
        tessedit_create_hocr: '0',
        tessedit_create_tsv: '0',
        tessedit_create_box: '0',
        tessedit_create_unlv: '0',
        tessedit_enable_doc_dict: '1'
    }
};

async function setupCamera() {
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Camera access not supported in this browser. Please use a modern browser with camera support.');
        }

        const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONFIG.CONSTRAINTS)
            .catch(error => {
                console.error('Camera access error:', error);
                if (error.name === 'NotAllowedError') {
                    throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
                } else if (error.name === 'NotFoundError') {
                    throw new Error('No camera found. Please ensure your device has a working camera.');
                } else if (error.name === 'NotReadableError') {
                    throw new Error('Camera is in use by another application. Please close other apps using the camera.');
                } else if (error.name === 'SecurityError') {
                    throw new Error('Camera access blocked. Please ensure you\'re using HTTPS or localhost.');
                }
                throw new Error('Failed to access camera. Please check your device settings.');
            });

        return stream;
    } catch (error) {
        console.error('Camera setup error:', error);
        const result = document.getElementById('result');
        if (result) {
            result.className = 'warning';
            result.textContent = error.message;
            result.style.display = 'block';
        }
        throw error;
    }
}

async function performOCR(canvas) {
    try {
        // Pre-process the image
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Increase contrast and convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const adjusted = avg > 127 ? 255 : 0; // Threshold for better text detection
            data[i] = data[i + 1] = data[i + 2] = adjusted;
        }
        ctx.putImageData(imageData, 0, 0);

        const result = await Tesseract.recognize(
            canvas, 
            'eng', 
            {
                ...CAMERA_CONFIG.OCR_SETTINGS,
                logger: progress => {
                    const processingMessage = document.getElementById('processingMessage');
                    if (processingMessage) {
                        processingMessage.textContent = `⚙️ Processing: ${Math.round(progress.progress * 100)}%`;
                    }
                }
            }
        );

        if (!result?.data?.text) {
            throw new Error('Failed to extract text from image');
        }

        // Enhanced text processing
        return result.data.text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Remove unwanted characters but keep important separators
                return line
                    .replace(/[^a-zA-Z0-9,.:;()/\s%-_]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            })
            .filter(line => {
                // Filter out lines that are likely not ingredients
                const nonIngredientPatterns = [
                    /^[0-9\s]*$/,  // Only numbers
                    /^[\s]*$/,     // Empty lines
                    /^[^a-zA-Z]*$/, // No letters
                    /^(barcode|upc|product|code|scan)/i // Common non-ingredient headers
                ];
                return !nonIngredientPatterns.some(pattern => pattern.test(line));
            })
            .join(', ');
    } catch (error) {
        console.error('OCR error:', error);
        throw new Error('Failed to process image. Please try again with a clearer image.');
    }
}

async function simulateScan() {
    let stream = null;
    let scanContainer = null;
    const scanButton = document.querySelector('button[onclick="simulateScan()"]');

    function cleanup() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (scanContainer && document.body.contains(scanContainer)) {
            document.body.removeChild(scanContainer);
        }
        if (scanButton) {
            scanButton.classList.remove('loading');
        }
    }

    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', handleEscapeKey);
        }
    }

    try {
        if (scanButton) {
            scanButton.classList.add('loading');
        }

        document.addEventListener('keydown', handleEscapeKey);
        stream = await setupCamera();

        scanContainer = document.createElement('div');
        scanContainer.className = 'scan-container';
        scanContainer.innerHTML = `
            <div class="camera-ui">
                <video id="camera" autoplay playsinline></video>
                <canvas id="captureCanvas" style="display: none;"></canvas>
                <button id="closeCameraBtn" class="close-camera" aria-label="Close camera">✕</button>
                <div class="camera-controls">
                    <button id="captureBtn" class="capture-button pulse" aria-label="Capture image">📸 Capture</button>
                </div>
                <div id="processingMessage" class="processing-message" style="display: none;" role="status" aria-live="polite">
                    ⚙️ Processing ingredients...
                </div>
            </div>
        `;
        document.body.appendChild(scanContainer);

        const video = document.getElementById('camera');
        const canvas = document.getElementById('captureCanvas');
        const captureBtn = document.getElementById('captureBtn');
        const processingMessage = document.getElementById('processingMessage');
        const closeBtn = document.getElementById('closeCameraBtn');

        if (!video || !canvas || !captureBtn || !processingMessage || !closeBtn) {
            throw new Error('Failed to initialize camera UI elements');
        }

        if (scanButton) {
            scanButton.classList.remove('loading');
        }

        video.srcObject = stream;
        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = () => reject(new Error('Failed to load video stream'));
        });
        await video.play().catch(() => {
            throw new Error('Failed to start video stream');
        });

        captureBtn.onclick = async () => {
            try {
                if (!video.videoWidth || !video.videoHeight) {
                    throw new Error('Video stream not ready. Please wait.');
                }

                captureBtn.disabled = true;
                captureBtn.classList.remove('pulse');
                processingMessage.style.display = 'block';

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);

                const recognizedText = await performOCR(canvas);
                if (!recognizedText) {
                    throw new Error('No text detected. Please try again with better lighting or positioning.');
                }

                const ingredients = document.getElementById('ingredients');
                if (ingredients) {
                    ingredients.value = recognizedText;
                    checkIngredients();
                }

                cleanup();
                document.removeEventListener('keydown', handleEscapeKey);
            } catch (error) {
                console.error('Capture error:', error);
                processingMessage.style.display = 'none';
                captureBtn.disabled = false;
                captureBtn.classList.add('pulse');
                
                const result = document.getElementById('result');
                if (result) {
                    result.className = 'warning';
                    result.textContent = error.message;
                    result.style.display = 'block';
                }
            }
        };

        closeBtn.onclick = () => {
            cleanup();
            document.removeEventListener('keydown', handleEscapeKey);
        };

    } catch (error) {
        console.error('Scan setup error:', error);
        cleanup();
        document.removeEventListener('keydown', handleEscapeKey);
        
        const result = document.getElementById('result');
        if (result) {
            result.className = 'warning';
            result.textContent = error.message;
            result.style.display = 'block';
        }
    }
}

// Add keyboard support for better accessibility
document.getElementById('newAllergen').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addAllergen();
    }
});

// Handle mobile keyboard for ingredients textarea
document.getElementById('ingredients').addEventListener('focus', function() {
    setTimeout(() => window.scrollTo(0, this.offsetTop - 10), 200);
});

async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadButton = event.target.parentElement;
    const result = document.getElementById('result');

    try {
        // Validate file
        if (!file.type.startsWith('image/')) {
            throw new Error('Please select an image file');
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            throw new Error('Image size too large. Please select an image under 10MB.');
        }

        // Show loading state
        uploadButton.classList.add('loading');
        const processingMessage = document.createElement('div');
        processingMessage.id = 'processingMessage';
        processingMessage.className = 'processing-message';
        processingMessage.textContent = '⚙️ Processing image...';
        document.body.appendChild(processingMessage);

        // Create image element for OCR
        const img = new Image();
        const imageUrl = URL.createObjectURL(file);

        // Process image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = imageUrl;
        });

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw and process image
        ctx.drawImage(img, 0, 0);
        const recognizedText = await performOCR(canvas);

        // Update UI with results
        const ingredients = document.getElementById('ingredients');
        if (ingredients) {
            ingredients.value = recognizedText;
            checkIngredients();
        }

        // Cleanup
        URL.revokeObjectURL(imageUrl);
        if (processingMessage.parentNode) {
            processingMessage.parentNode.removeChild(processingMessage);
        }

    } catch (error) {
        console.error('Image upload error:', error);
        if (result) {
            result.className = 'warning';
            result.textContent = error.message || 'Failed to process image. Please try again.';
            result.style.display = 'block';
        }
    } finally {
        // Reset upload button and input
        uploadButton.classList.remove('loading');
        event.target.value = ''; // Reset file input
    }
}
