# RecapAI
> 
> **This is a free, open-source initiative - NOT a full-service product!**
> 
> There are numerous paid interview preparation tools charging hundreds of dollars for comprehensive features like live audio capture, automated answer generation, and more. This project is fundamentally different:
> 

> ## 🔑 API KEY INFORMATION - UPDATED
>
> We have tested and confirmed that **OpenAI, Anthropic, and Gemini APIs work properly** with the current version. If you are experiencing issues with your API keys:
>
> - Try deleting your API key entry from the config file located in your user data directory
> - Log out and log back in to the application
> - Check your API provider dashboard to verify the key is active and has sufficient credits
> - Ensure you're using the correct API key format for your selected provider
>
> The configuration file is stored at: `C:\Users\[USERNAME]\AppData\Roaming\recap-ai\config.json` (on Windows) or `/Users/[USERNAME]/Library/Application Support/recap-ai/config.json` (on macOS)

## Free, Open-Source AI-Powered Interview Preparation Tool

This project provides a powerful alternative to premium coding interview platforms. It delivers the core functionality of paid interview preparation tools but in a free, open-source package. Using your own API keys, you get access to advanced features like AI-powered problem analysis, solution generation, and debugging assistance - all running locally on your machine.

### Why This Exists

The best coding interview tools are often behind expensive paywalls, making them inaccessible to many students and job seekers. This project provides the same powerful functionality without the cost barrier, letting you:

- Use your own API keys (pay only for what you use)
- Run everything locally on your machine with complete privacy
- Make customizations to suit your specific needs
- Learn from and contribute to an open-source tool

### Customization Possibilities

The codebase is designed to be adaptable:

- **AI Models**: Currently supporting OpenAI, Anthropic, and Gemini models. You can modify the code to integrate with other providers like Deepseek, Llama, or any model with an API. All integration code is in `electron/ProcessingHelper.ts` and UI settings are in `src/components/Settings/SettingsDialog.tsx`.
- **Languages**: Add support for additional programming languages
- **Features**: Extend the functionality with new capabilities 
- **UI**: Customize the interface to your preferences

All it takes is modest JavaScript/TypeScript knowledge and understanding of the API you want to integrate.

## Features

- 🎯 99% Invisibility: Undetectable window that bypasses most screen capture methods
- 📸 Smart Screenshot Capture: Capture both question text and code separately for better analysis
- 🤖 AI-Powered Analysis: Automatically extracts and analyzes coding problems using powerful Vision APIs
- 💡 Solution Generation: Get detailed explanations and solutions with time/space complexity analysis
- 🔧 Real-time Debugging: Debug your code with AI assistance and structured feedback
- 🎨 Advanced Window Management: Freely move, resize, change opacity, and zoom the window
- 🔄 Model Selection: Choose between different LLMs for different processing stages
- 🔒 Privacy-Focused: Your API key and data never leave your computer except for API calls to your chosen provider

## Global Commands

The application uses unidentifiable global keyboard shortcuts that won't be detected by browsers or other applications:

- Toggle Window Visibility: [Control or Cmd + B]
- Move Window: [Control or Cmd + Arrow keys]
- Take Screenshot: [Control or Cmd + H]
- Delete Last Screenshot: [Control or Cmd + L]
- Process Screenshots: [Control or Cmd + Enter]
- Start New Problem: [Control or Cmd + R]
- Quit: [Control or Cmd + Q]
- Decrease Opacity: [Control or Cmd + []
- Increase Opacity: [Control or Cmd + ]]
- Zoom Out: [Control or Cmd + -]
- Reset Zoom: [Control or Cmd + 0]
- Zoom In: [Control or Cmd + =]

## Invisibility Compatibility

The application is invisible to:

- Zoom versions below 6.1.6 (inclusive)
- All browser-based screen recording software
- All versions of Discord
- Mac OS _screenshot_ functionality (Command + Shift + 3/4)

Note: The application is **NOT** invisible to:

- Zoom versions 6.1.6 and above
  - https://zoom.en.uptodown.com/mac/versions (link to downgrade Zoom if needed)
- Mac OS native screen _recording_ (Command + Shift + 5)

## Prerequisites

- Node.js (v16 or higher)
- npm or bun package manager
- API Key (OpenAI, Anthropic, or Gemini)
- Screen Recording Permission for Terminal/IDE
  - On macOS:
    1. Go to System Preferences > Security & Privacy > Privacy > Screen Recording
    2. Ensure that RecapAI has screen recording permission enabled
    3. Restart RecapAI after enabling permissions
  - On Windows:
    - No additional permissions needed
  - On Linux:
    - May require `xhost` access depending on your distribution

## Running the Application

### Quick Start

1. Clone the repository:

```bash
git clone https://github.com/ibttf/recap-ai.git
cd recap-ai
```

2. Install dependencies:

```bash
npm install
```

3. **RECOMMENDED**: Clean any previous builds:

```bash
npm run clean
```

4. Run the appropriate script for your platform:

**For Windows:**
```bash
stealth-run.bat
```

**For macOS/Linux:**
```bash
# Make the script executable first
chmod +x stealth-run.sh
./stealth-run.sh
```

**IMPORTANT**: The application window will be invisible by default! Use Ctrl+B (or Cmd+B on Mac) to toggle visibility.

### Building Distributable Packages

To create installable packages for distribution:

**For macOS (DMG):**
```bash
# Using npm
npm run package-mac

# Or using yarn
yarn package-mac
```

**For Windows (Installer):**
```bash
# Using npm
npm run package-win

# Or using yarn
yarn package-win
```

The packaged applications will be available in the `release` directory.

**What the scripts do:**
- Create necessary directories for the application
- Clean previous builds to ensure a fresh start
- Build the application in production mode
- Launch the application in invisible mode

### Windows Silent Launcher (`launch.vbs`)

I created a custom VBScript launcher (`launch.vbs`) to provide a completely invisible startup experience on Windows. Here is the thought process and mechanism behind its creation:

1. **VBScript Environment**: It uses the native Windows Script Host (`WScript.Shell`) to execute background commands without spawning visible Command Prompt windows, avoiding taskbar icons.
2. **First-Run Build Detection**: It leverages the `Scripting.FileSystemObject` to automatically check if `dist-electron/main.js` and `dist/index.html` exist. If they do not, it triggers `npm run build` so the app compiles itself automatically upon the user's first click.
3. **Silent Execution**: Once successfully built, it executes `npm run run-prod` with the hidden window style parameter set to `0`, successfully starting the background Electron application entirely invisibly.

### Notes & Troubleshooting

- **Window Manager Compatibility**: Some window management tools (like Rectangle Pro on macOS) may interfere with the app's window movement. Consider disabling them temporarily.

- **API Usage**: Be mindful of your chosen API key's rate limits and credit usage. Vision API calls are more expensive than text-only calls.

- **LLM Customization**: You can easily customize the app to include other LLMs by modifying the API calls in `ProcessingHelper.ts` and related UI components.

- **Common Issues**:
  - Run `npm run clean` before starting the app for a fresh build
  - Use Ctrl+B/Cmd+B multiple times if the window doesn't appear
  - Adjust window opacity with Ctrl+[/]/Cmd+[/] if needed
  - For macOS: ensure script has execute permissions (`chmod +x stealth-run.sh`)

## Comparison with Paid Interview Tools

| Feature | Premium Tools (Paid) | RecapAI (This Project) |
|---------|------------------------|----------------------------------------|
| Price | $60/month subscription | Free (only pay for your API usage) |
| Solution Generation | ✅ | ✅ |
| Debugging Assistance | ✅ | ✅ |
| Invisibility | ✅ | ✅ |
| Multi-language Support | ✅ | ✅ |
| Time/Space Complexity Analysis | ✅ | ✅ |
| Window Management | ✅ | ✅ |
| Auth System | Required | None (Simplified) |
| Payment Processing | Required | None (Use your own API key) |
| Privacy | Server-processed | 100% Local Processing |
| Customization | Limited | Full Source Code Access |
| Model Selection | Limited | Choice Between Models |

## Tech Stack

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI Components
- OpenAI/Anthropic SDKs

## How It Works

1. **Initial Setup**
   - Launch the invisible window
   - Enter your preferred API key in the settings
   - Choose your preferred model for extraction, solution generation, and debugging

2. **Capturing Problem**
   - Use global shortcut [Control or Cmd + H] to take screenshots of code problems
   - Screenshots are automatically added to the queue of up to 2
   - If needed, remove the last screenshot with [Control or Cmd + L]

3. **Processing**
   - Press [Control or Cmd + Enter] to analyze the screenshots
   - AI extracts problem requirements from the screenshots using Vision APIs
   - The model generates an optimal solution based on the extracted information
   - All analysis is done using your personal API key

4. **Solution & Debugging**
   - View the generated solutions with detailed explanations
   - Use debugging feature by taking more screenshots of error messages or code
   - Get structured analysis with identified issues, corrections, and optimizations
   - Toggle between solutions and queue views as needed

5. **Window Management**
   - Move window using [Control or Cmd + Arrow keys]
   - Toggle visibility with [Control or Cmd + B]
   - Adjust opacity with [Control or Cmd + [] and [Control or Cmd + ]]
   - Window remains invisible to specified screen sharing applications
   - Start a new problem using [Control or Cmd + R]

6. **Language Selection**
   - Easily switch between programming languages with a single click
   - Use arrow keys for keyboard navigation through available languages
   - The system dynamically adapts to any languages added or removed from the codebase
   - Your language preference is saved between sessions

## Adding More AI Models

This application is built with extensibility in mind. You can easily add support for additional LLMs alongside the existing integrations:

- You can add Grok, local models, or any other AI model as alternative options
- The application architecture allows for multiple LLM backends to coexist
- Users can have the freedom to choose their preferred AI provider

To add new models, simply extend the API integration in `electron/ProcessingHelper.ts` and add the corresponding UI options in `src/components/Settings/SettingsDialog.tsx`. The modular design makes this straightforward without disrupting existing functionality.

## Configuration

- **API Keys**: Your personal API keys are stored locally and only used for API calls
- **Model Selection**: You can choose between different models for each stage of processing:
  - Problem Extraction: Analyzes screenshots to understand the coding problem
  - Solution Generation: Creates optimized solutions with explanations
  - Debugging: Provides detailed analysis of errors and improvement suggestions
- **Language**: Select your preferred programming language for solutions
- **Window Controls**: Adjust opacity, position, and zoom level using keyboard shortcuts
- **All settings are stored locally** in your user data directory and persist between sessions


