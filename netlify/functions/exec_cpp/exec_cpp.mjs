import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

//relative to the function file itself
const binaryPath = './testcpp';

export default async (event, context) => {
  try {
    //execute le cpp déjà compilé
    const { stdout, stderr } = await execPromise(`${binaryPath}`);

    if (stderr) {
      console.error('C++ Binary Error:', stderr);
      // We still return a Response, but with a 500 status for binary errors
      return new Response(
        JSON.stringify({ message: `C++ execution error: ${stderr}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // The result from the C++ program is captured in stdout
    const cppResult = stdout.trim();

    return new Response(
      JSON.stringify({ result: cppResult }),
      { 
        statusCode: 200, // statusCode is passed in the options object
        headers: { "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('Execution Failed:', error);
    // CORRECT: Return a new Response object for general errors
    return new Response(
      JSON.stringify({ message: `Failed to execute C++ code: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};