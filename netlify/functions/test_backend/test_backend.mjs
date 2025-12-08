// // Docs on request and context https://docs.netlify.com/functions/build/#code-your-function-2
// export default (request, context) => {
//   try {
//     const url = new URL(request.url)
//     const subject = url.searchParams.get('name') || 'World'

//     return new Response(`Hello ${subject}`)
//   } catch (error) {
//     return new Response(error.toString(), {
//       status: 500,
//     })
//   }
// }


import { exec } from "child_process";
import { writeFile, readFile } from "fs/promises";

export default async (request, context) => {
  try {
    // Ensure POST
    if (request.method !== "POST") {
      return new Response("Only POST allowed", { status: 405 });
    }

    // Parse JSON body
    const { fileContent, isBase64Encoded } = await request.json();

    if (!fileContent) {
      return new Response("No file content provided", { status: 400 });
    }

    // Decode Base64
    const buffer = Buffer.from(fileContent, "base64");

    // Input and output paths in /tmp folder of netlify.
    const inputFilePath = "/tmp/uploaded_file.ldr";
    const outputFilePath = "/tmp/converted.lbcode";

    await writeFile(inputFilePath, buffer);

    console.log("Saved uploaded file to:", inputFilePath);

    // Call your Python script with the saved file path
    const pythonOutput = await new Promise((resolve, reject) => {
      exec(`python3 netlify/functions/test_backend/ldr_to_lbcode.py ${inputFilePath} ${outputFilePath}`, 
        (error, stdout, stderr) => {
        if (error) return reject(stderr || error.message);
        resolve(stdout || "");
      });
    });

    // Read resulting binary LBCode file
    const lbcodeBytes = await readFile(outputFilePath);

    // Must return base64 because raw binary isn't safe in JSON/HTTP
    const base64Result = lbcodeBytes.toString("base64");

    return new Response(
      JSON.stringify({
        success: true,
        lbcodeBase64: base64Result
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(String(error), { status: 500 });
  }
};

