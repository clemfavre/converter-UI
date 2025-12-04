// ===== DOM Elements =====
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const preview = document.getElementById('preview');
const clearBtn = document.getElementById('clear-btn');

// Store uploaded files
let uploadedFiles = [];

// ===== EVENT LISTENERS =====

// 1. Click on drop zone to trigger file input
dropZone.addEventListener('click', () => {
    fileInput.click();
});

// 2. Handle file selection via input
fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// 3. Drag & drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

// Highlight drop zone when dragging over
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

// Handle dropped files
dropZone.addEventListener('drop', (e) => {
    handleFiles(e.dataTransfer.files);
});

// 4. Clear button
clearBtn.addEventListener('click', () => {
    uploadedFiles = [];
    fileInput.value = ''; // Reset file input
    preview.innerHTML = '';
    console.log('Cleared all files');
});

// ===== HELPER FUNCTIONS =====

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropZone.style.borderColor = '#007bff';
    dropZone.style.backgroundColor = '#f0f8ff';
}

function unhighlight() {
    dropZone.style.borderColor = '#cccccc';
    dropZone.style.backgroundColor = 'transparent';
}

function handleFiles(files) {
    // Convert FileList to array and filter only images
    const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
    );
    
    if (imageFiles.length === 0) {
        alert('Please select image files only (JPEG, PNG, GIF, etc.)');
        return;
    }
    
    // Add to uploaded files array
    uploadedFiles.push(...imageFiles);
    
    // Update preview
    updatePreview();
    
    // Log files for debugging
    console.log('Uploaded files:', uploadedFiles);
    
    // Optional: Upload to Edge Function
    // uploadToEdgeFunction(imageFiles);
}

function updatePreview() {
    // Clear existing preview
    preview.innerHTML = '';
    
    // Add each file to preview
    uploadedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        
        // Create image preview
        const img = document.createElement('img');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Create file info
        const info = document.createElement('div');
        info.innerHTML = `
            <strong>${file.name}</strong><br>
            <small>${formatFileSize(file.size)} • ${file.type}</small>
        `;
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.classList.add('remove-btn');
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadedFiles.splice(index, 1);
            updatePreview();
        });
        
        // Assemble the list item
        li.appendChild(img);
        li.appendChild(info);
        li.appendChild(removeBtn);
        preview.appendChild(li);
    });
    
    // Update drop zone text if files are uploaded
    if (uploadedFiles.length > 0) {
        dropZone.innerHTML = `
            <div style="text-align: center;">
                <div>📁 ${uploadedFiles.length} image(s) selected</div>
                <small>Click to add more or drag & drop</small>
            </div>
            <input type="file" id="file-input" multiple accept="image/*" />
        `;
    } else {
        dropZone.innerHTML = `
            Drop images here, or click to upload.
            <input type="file" id="file-input" multiple accept="image/*" />
        `;
    }
    
    // Re-attach the event listener to the new file input
    document.getElementById('file-input').addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== UPLOAD TO EDGE FUNCTION =====
async function uploadToEdgeFunction(files) {
    console.log('Uploading to Netlify Edge Function...');
    
    const formData = new FormData();
    files.forEach((file, index) => {
        formData.append('images', file);
    });
    
    try {
        // Call your Edge Function
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log('Upload successful:', result);
        
        // Show success message
        const status = document.getElementById('upload-status');
        if (status) {
            status.textContent = `✓ Uploaded ${files.length} images`;
            status.style.color = 'green';
        }
        
    } catch (error) {
        console.error('Upload failed:', error);
        
        // Show error message
        const status = document.getElementById('upload-status');
        if (status) {
            status.textContent = `✗ Upload failed: ${error.message}`;
            status.style.color = 'red';
        }
    }
}