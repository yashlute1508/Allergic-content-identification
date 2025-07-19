// Initialize allergens from localStorage or set empty array
let allergens = JSON.parse(localStorage.getItem('allergens') || '[]');

// Improve mobile touch handling
document.addEventListener('touchstart', function(event) {
    if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        event.target.focus();
    }
}, { passive: true });

// Prevent zoom on double tap but allow pinch zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Add touch feedback
const buttons = document.getElementsByTagName('button');
Array.from(buttons).forEach(button => {
    button.addEventListener('touchstart', function() {
        this.style.transform = 'scale(0.95)';
    }, { passive: true });
    
    button.addEventListener('touchend', function() {
        this.style.transform = 'scale(1)';
    }, { passive: true });
});

// Handle mobile keyboard issues
const newAllergenInput = document.getElementById('newAllergen');
newAllergenInput.addEventListener('focus', function() {
    setTimeout(() => window.scrollTo(0, newAllergenInput.offsetTop - 10), 200);
});

// Render initial allergen list
renderAllergens();

function renderAllergens() {
    const list = document.getElementById('allergenList');
    list.innerHTML = allergens.map(allergen => `
        <div class="allergen-item">
            <span>${allergen}</span>
            <button class="remove-allergen" onclick="removeAllergen('${allergen}')" role="button" aria-label="Remove ${allergen}">Remove</button>
        </div>
    `).join('');
    saveAllergens();
}

function addAllergen() {
    const input = document.getElementById('newAllergen');
    const allergen = input.value.trim().toLowerCase();
    
    if (allergen && !allergens.includes(allergen)) {
        allergens.push(allergen);
        renderAllergens();
        input.value = '';
        input.blur(); // Hide mobile keyboard after adding
    }
}

function removeAllergen(allergen) {
    allergens = allergens.filter(a => a !== allergen);
    renderAllergens();
}

function saveAllergens() {
    localStorage.setItem('allergens', JSON.stringify(allergens));
}

function checkIngredients() {
    const ingredientText = document.getElementById('ingredients').value.toLowerCase();
    const result = document.getElementById('result');
    const foundAllergens = allergens.filter(allergen => 
        ingredientText.includes(allergen) ||
        ingredientText.split(',').some(ingredient => 
            ingredient.trim().includes(allergen)
        )
    );

    result.style.display = 'block';
    
    if (foundAllergens.length > 0) {
        result.className = 'warning';
        result.innerHTML = `⚠️ Warning: Contains allergens: ${foundAllergens.join(', ')}`;
        // Vibrate on mobile if allergens found
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    } else {
        result.className = 'safe';
        result.innerHTML = '✅ No known allergens detected';
    }

    // Hide mobile keyboard after checking
    document.getElementById('ingredients').blur();
}

function exportProfile() {
    const dataStr = JSON.stringify(allergens, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'allergy-profile.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importProfile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,text/plain';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedAllergens = JSON.parse(event.target.result);
                if (Array.isArray(importedAllergens)) {
                    allergens = [...new Set([...allergens, ...importedAllergens])];
                    renderAllergens();
                }
            } catch (error) {
                alert('Invalid file format. Please use a valid JSON file.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

async function simulateScan() {
    const scanContainer = document.createElement('div');
    scanContainer.className = 'scan-container';
    scanContainer.innerHTML = `
        <div class="camera-ui">
            <video id="camera" autoplay playsinline></video>
            <canvas id="captureCanvas" style="display: none;"></canvas>
            <div class="camera-controls">
                <button id="captureBtn" class="capture-button">Capture</button>
                <button id="closeCameraBtn" class="close-camera">Close</button>
            </div>
            <div id="processingMessage" class="processing-message" style="display: none;">
                Processing image...
            </div>
        </div>
    `;
    document.body.appendChild(scanContainer);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        });

        const video = document.getElementById('camera');
        const canvas = document.getElementById('captureCanvas');
        const captureBtn = document.getElementById('captureBtn');
        const processingMessage = document.getElementById('processingMessage');
        video.srcObject = stream;

        captureBtn.onclick = async () => {
            // Capture frame from video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            // Show processing message
            processingMessage.style.display = 'block';
            captureBtn.disabled = true;

            try {
                // Perform OCR
                const result = await Tesseract.recognize(canvas, 'eng');
                document.getElementById('ingredients').value = result.data.text;
                
                // Clean up camera and process ingredients
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(scanContainer);
                checkIngredients();
            } catch (error) {
                alert('Error processing image. Please try again.');
                processingMessage.style.display = 'none';
                captureBtn.disabled = false;
            }
        };

        document.getElementById('closeCameraBtn').onclick = () => {
            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(scanContainer);
        };
    } catch (error) {
        alert('Unable to access camera. Please ensure camera permissions are granted.');
        document.body.removeChild(scanContainer);
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