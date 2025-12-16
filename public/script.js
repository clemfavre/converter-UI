let ldr_file;

const dropZone = document.getElementById("drop-zone");
const dropZoneText = dropZone.textContent;
const fileInput = document.getElementById("file-input");
const filePreview = document.getElementById("preview");
const clearButton = document.getElementById("clear-btn");
const convertButton = document.getElementById("convert-btn");
const downloadExampleButton = document.getElementById("download-example-btn");

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

    dropZone.textContent = file.name;
    ldr_file = file;
}

async function sendFileToBackend(file) {
    // 1. Read the file content as a Data URL (Base64)
    const reader = new FileReader();

    reader.onload = async function(event) {
        // The result is a Data URL: "data:text/plain;base64,RklMR..."
        const base64Content = event.target.result.split(',')[1]; // Get only the Base64 part

        //send ldr to backend
        const answer = await fetch('/.netlify/functions/test_backend', {
            method: 'POST',
            // Headers tell the function how to interpret the body
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the Base64 string in the body
            body: JSON.stringify({ 
                fileContent: base64Content,
                isBase64Encoded: true
            }) 
        });
        
        //handles invalid inputs
        if (answer.status === 400) {
            alert("Bad request: the provided file might be empty");
        } else if (answer.status === 500) {
            alert("Internal server error: the provided file might be invalid")
        }

        //parse answer
        const parsed = await answer.json();
        console.log("parsed RESPONSE:", parsed);

        //download lbcode
        if (answer.ok) {
            downloadLBCode(parsed.lbcodeBase64);
        }
    };

    // Read the file as a Data URL (which encodes it in Base64)
    reader.readAsDataURL(file);
}

function downloadLBCode(base64, filename = "converted.lbcode") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    
    const blob = new Blob([bytes], { type: "application/octet-stream" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}

// Clears the DropZone, resets the ldrContent
clearButton.addEventListener("click", () => {
    dropZone.textContent = dropZoneText;
    ldr_file = "";
})

convertButton.addEventListener("click", () => {
    sendFileToBackend(ldr_file);
})

downloadExampleButton.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = "/house_example.lbcode";
    a.download = "house_example.lbcode";
    a.click();
})