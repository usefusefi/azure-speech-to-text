# Real-time Speech-to-Text Transcription

A modern web application that provides real-time speech-to-text transcription using Azure Speech Services. This application features a clean, intuitive interface with streaming transcription capabilities, making it perfect for real-time speech recognition needs.

![Demo](demo.gif)

## Features

- **Real-time Streaming Transcription**
  - Streaming updates
  - Immediate feedback as you speak
  - Smooth, continuous transcription flow

- **Dual Input Support**
  - Microphone input transcription
  - Speaker output transcription
  - Clear visual distinction between sources

- **UI/UX**
  - Chat-style interface
  - Real-time message updates
  - Timestamp tracking
  - Responsive design
  - Clean, intuitive controls

- **Secure Configuration**
  - Local storage of Azure credentials
  - No server-side storage
  - Easy settings management

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/usefusefi/azure-speech-to-text.git
   cd azure-speech-to-text
   ```

2. Open `index.html` in your web browser

3. Configure Azure Speech Services:
   - Enter your Azure Speech API key
   - Enter your Azure region
   - Click "Save Settings"

4. Start transcribing:
   - Click "Start Recording"
   - Allow microphone access
   - Begin speaking
   - Watch the real-time transcription

## Prerequisites

- Azure account with Speech Services enabled
- Azure Speech Services API key
- Modern web browser with microphone support
- Internet connection

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Security

Your Azure credentials are stored securely in your browser's localStorage. They are only used to communicate with Azure's Speech Services API and are never sent to any other server.

## Technical Details

- Built with vanilla JavaScript
- Uses Azure Speech SDK for JavaScript
- No build process required
- No dependencies to install

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Azure Speech Services for providing the speech recognition capabilities
- Microsoft for the Speech SDK for JavaScript 