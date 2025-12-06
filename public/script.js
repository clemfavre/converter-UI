let ldrContent = ""; // stores the .ldr file text
let ldr_file;

const dropZone = document.getElementById("drop-zone");
const dropZoneText = dropZone.textContent;
const fileInput = document.getElementById("file-input");
const filePreview = document.getElementById("preview");
const clearButton = document.getElementById("clear-btn");
const convertButton = document.getElementById("convert-btn");

// Clicking the zone opens the file dialog
dropZone.addEventListener("click", () => fileInput.click());

// Prevent default drag behaviors
["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, e => e.preventDefault());
});

// Handle dropped file
dropZone.addEventListener("drop", e => {
    const file = e.dataTransfer.files[0];
    handleFile(file);
    dropZone.textContent = file.name;
});

// Handle file selected via input
fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    handleFile(file);
});

function handleFile(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".ldr")) {
        alert("Please upload a .ldr file.");
        return;
    }

    ldr_file = file;
}

async function sendFileToBackend(file) {
    // 1. Read the file content as a Data URL (Base64)
    const reader = new FileReader();

    reader.onload = async function(event) {
        // The result is a Data URL: "data:text/plain;base64,RklMR..."
        const base64Content = event.target.result.split(',')[1]; // Get only the Base64 part

        const response = await fetch('/.netlify/functions/test_backend', {
            method: 'POST',
            // Headers tell the function how to interpret the body
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the Base64 string in the body
            body: JSON.stringify({ 
                fileContent: base64Content,
                isBase64Encoded: true // Useful hint for the Python function
            }) 
        });

        const result = await response.text();
        
        if (response.ok) {
            console.log("Backend response:", result);
        } else {
            console.error("Backend error:", result.error);
        }
    };

    // Read the file as a Data URL (which encodes it in Base64)
    reader.readAsDataURL(file);
}

// Clears the DropZone, resets the ldrContent
clearButton.addEventListener("click", () => {
    ldrContent = "";
    dropZone.textContent = dropZoneText;
    ldr_file = "";
})

convertButton.addEventListener("click", () => {
    sendFileToBackend(ldr_file);
})
