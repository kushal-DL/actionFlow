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
![image](https://github.com/user-attachments/assets/f1c12502-3b46-4ad6-8fb5-9654f42e54cf)
![image](https://github.com/user-attachments/assets/0b2f924f-cd69-40c4-898f-8344d78654c2)

## How to Run

Follow these steps to get the application running on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 20 or later recommended)
-   `npm` (usually comes with Node.js)
-   [Ollama](https://ollama.com/) installed and running.

### 1. Download and Run an Ollama Model

This application is configured to use a local LLM running via Ollama.

1.  If you haven't already, [download and install Ollama](https://ollama.com/).
2.  Pull the model you want to use. For example, to use `llama3`:
    ```bash
    ollama run llama3
    ```
3.  Ensure the Ollama server is running.

### 2. Set Up Environment Variables

The application **requires** a `.env` file in the project root to manage its connection to Ollama and other settings.

1.  Create a file named `.env` in the root of the project.
2.  Add the following variables. You **must** provide the name of the Ollama model you have downloaded. The server URL is optional and defaults to the standard local address.
    ```
    # REQUIRED: The name of the model you have downloaded via `ollama run <model_name>`
    LLM_MODEL_NAME="llama3.2:3b"
    
    # OPTIONAL: The URL of your Ollama server
    LLM_API_URL="http://127.0.0.1:11434"

    # REQUIRED: The directory to save live transcriptions (relative to the project root)
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

You should see the ActionFlow application interface. You can now start managing your tasks and interacting with Jarvis!
