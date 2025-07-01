<!-- Author: Kushal Sharma -->
# ActionFlow - Your AI-Powered Task Manager

ActionFlow is a smart task management application built with Next.js, React, and a local Ollama instance for AI features. It helps you organize your daily, weekly, and sprint-based tasks with the help of an AI assistant named Jarvis.

## Features

-   **Task Management:** Organize tasks into Daily, Weekly, Sprint, and Miscellaneous checklists.
-   **Sprint Planning:** Manage development sprints with customizable start/end dates and automatic rollover.
-   **AI Assistant (Jarvis):**
    -   Answer questions about your tasks.
    -   Create new tasks from natural language using voice or text.
    -   Summarize large bodies of text (up to 500,000 characters).
    -   Live transcribe audio from your microphone and save it to a file.
-   **Contact Management:** Keep a list of contacts to assign tasks to.
-   **Export:** Export your task lists to a CSV file.

## How to Run

Follow these steps to get the application running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 20 or later recommended)
-   `npm` (usually comes with Node.js)
-   [Ollama](https://ollama.com/) installed and running (only if using a local model).

### 1. Download and Run an Ollama Model (Optional)

If you plan to use a local LLM, you'll need to run it via Ollama.

1.  If you haven't already, [download and install Ollama](https://ollama.com/).
2.  Pull the model you want to use. For example, to use `llama3`:
    ```bash
    ollama run llama3
    ```
3.  Ensure the Ollama server is running.

### 2. Set Up Environment Variables

The application requires a `.env` file in the project root to connect to an AI model. You can configure it to use a local Ollama model or a cloud-based model like Google Gemini.

1.  Create a file named `.env` in the root of the project.
2.  Add the configuration variables based on your chosen model provider.

#### Option A: Using a Local Ollama Model (Default)

This is the simplest way to get started if you have Ollama running locally.

```
# The name of the model you have downloaded (e.g., "llama3")
LLM_MODEL_NAME="llama3"

# The URL of your local Ollama server
LLM_API_URL="http://127.0.0.1:11434"

# Leave this blank for Ollama
LLM_API_KEY=

# The path to save live transcriptions
TRANSCRIPTION_SAVE_PATH="src/data/transcriptions"
```

#### Option B: Using Google Gemini

To use a powerful cloud model like Gemini, you'll need an API key from Google AI Studio.

1.  Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  Use the following configuration in your `.env` file:

```
# The name of the Gemini model you want to use
LLM_MODEL_NAME="gemini-2.0-flash-001"

# The API endpoint for the Gemini API
LLM_API_URL="https://generativelanguage.googleapis.com/v1beta/models"

# Paste your API key here
LLM_API_KEY="YOUR_GEMINI_API_KEY"

# The path to save live transcriptions
TRANSCRIPTION_SAVE_PATH="src/data/transcriptions"
```
*Note: The application will create the transcription directory if it doesn't exist.*

### 3. Install Dependencies

Open your terminal in the project's root directory and run the following command to install all the necessary packages.

```bash
npm install
```

### 4. Run the Application

Once the installation is complete, start the development server:

```bash
npm run dev
```

This command starts the Next.js application in development mode with Turbopack for faster performance.

### 5. Open in Browser

The application will now be running. Open your web browser and go to:

[http://localhost:9002](http://localhost:9002)

NOTE: You can alternatively choose to run install.bat to install all dependencies and set the URL for application as http://actionflow.com:9002 and launch the application using launch.bat file.

You should see the ActionFlow application interface. You can now start managing your tasks and interacting with Jarvis!
