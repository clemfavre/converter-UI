let ldrContent = ""; // stores the .ldr file text

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");

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

    const reader = new FileReader();

    reader.onload = (e) => {
        ldrContent = e.target.result; // the text of the LDR file

        console.log("LDR file content loaded:");
        console.log(ldrContent);

        // Call your program here:
        processLDR(ldrContent);
    };

    reader.readAsText(file);
}

// Placeholder for your program
function processLDR(text) {
    console.log("Processing LDR...");
    // --- Insert your own program logic here ---
}
