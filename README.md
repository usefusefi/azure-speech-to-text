# Real-time Speech Transcription

This is a web application that provides real-time speech-to-text transcription using Azure Speech Services. It can transcribe both microphone input and speaker output in a chat-style interface.

## Features

- Real-time speech-to-text transcription
- Support for both microphone input and speaker output
- Chat-style interface with timestamps
- Secure storage of Azure credentials
- Modern and responsive UI

## Prerequisites

1. An Azure account with Speech Services enabled
2. Azure Speech Services API key and region
3. A modern web browser with microphone access

## Setup

1. Clone this repository
2. Open `index.html` in a web browser
3. Enter your Azure Speech Services API key and region in the settings panel
4. Click "Save Settings"

## Usage

1. After saving your Azure credentials, click the "Start Recording" button
2. Allow microphone access when prompted by your browser
3. Speak into your microphone to see real-time transcription
4. Click "Stop Recording" when you're done

## Security Note

Your Azure credentials are stored locally in your browser's localStorage. They are not sent to any server other than Azure's Speech Services API.

## Browser Support

This application works best in modern browsers that support the Web Audio API and have good support for the Azure Speech SDK for JavaScript.

## Troubleshooting

If you encounter any issues:

1. Make sure your Azure credentials are correct
2. Check that your microphone is properly connected and has necessary permissions
3. Ensure you have a stable internet connection
4. Try refreshing the page if the application becomes unresponsive 