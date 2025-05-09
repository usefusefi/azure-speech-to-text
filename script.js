let speechConfig;
let recognizer;
let isRecording = false;
let currentMessageDiv = null;

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const regionInput = document.getElementById('region');
const saveSettingsBtn = document.getElementById('saveSettings');
const startRecordingBtn = document.getElementById('startRecording');
const stopRecordingBtn = document.getElementById('stopRecording');
const transcriptionBox = document.getElementById('transcriptionBox');

// Load saved settings
function loadSettings() {
    const savedApiKey = localStorage.getItem('azureApiKey');
    const savedRegion = localStorage.getItem('azureRegion');
    
    if (savedApiKey) apiKeyInput.value = savedApiKey;
    if (savedRegion) regionInput.value = savedRegion;
}

// Save settings
saveSettingsBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const region = regionInput.value.trim();
    
    if (!apiKey || !region) {
        alert('Please enter both API Key and Region');
        return;
    }
    
    localStorage.setItem('azureApiKey', apiKey);
    localStorage.setItem('azureRegion', region);
    alert('Settings saved successfully!');
});

// Initialize speech configuration
function initializeSpeechConfig() {
    const apiKey = localStorage.getItem('azureApiKey');
    const region = localStorage.getItem('azureRegion');
    
    if (!apiKey || !region) {
        alert('Please configure Azure Speech settings first');
        return false;
    }
    
    speechConfig = SpeechSDK.SpeechConfig.fromSubscription(apiKey, region);
    speechConfig.speechRecognitionLanguage = 'en-US';
    return true;
}

// Create a new message container
function createNewMessage(source) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${source}`;
    
    const textContent = document.createElement('div');
    textContent.className = 'text-content';
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(textContent);
    messageDiv.appendChild(timestamp);
    transcriptionBox.appendChild(messageDiv);
    
    // Scroll to bottom
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
    
    return messageDiv;
}

// Add message to transcription box
function addMessage(text, source) {
    const messageDiv = createNewMessage(source);
    const textContent = messageDiv.querySelector('.text-content');
    textContent.textContent = text;
}

// Update streaming text
function updateStreamingText(text) {
    if (!currentMessageDiv) {
        currentMessageDiv = createNewMessage('microphone');
    }
    const textContent = currentMessageDiv.querySelector('.text-content');
    textContent.textContent = text;
}

// Start recording
startRecordingBtn.addEventListener('click', async () => {
    if (!initializeSpeechConfig()) return;
    
    try {
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
        
        // Handle intermediate results (streaming)
        recognizer.recognizing = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
                updateStreamingText(e.result.text);
            }
        };
        
        // Handle final results
        recognizer.recognized = (s, e) => {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                // Create a new message for the next segment
                currentMessageDiv = null;
            }
        };
        
        recognizer.startContinuousRecognitionAsync(
            () => {
                isRecording = true;
                startRecordingBtn.disabled = true;
                stopRecordingBtn.disabled = false;
                addMessage('Recording started...', 'system');
            },
            (error) => {
                console.error('Error starting recognition:', error);
                alert('Error starting recognition. Please check your settings and try again.');
            }
        );
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        alert('Error initializing speech recognition. Please check your settings and try again.');
    }
});

// Stop recording
stopRecordingBtn.addEventListener('click', () => {
    if (recognizer) {
        recognizer.stopContinuousRecognitionAsync(
            () => {
                isRecording = false;
                startRecordingBtn.disabled = false;
                stopRecordingBtn.disabled = true;
                currentMessageDiv = null;
                addMessage('Recording stopped.', 'system');
            },
            (error) => {
                console.error('Error stopping recognition:', error);
            }
        );
    }
});

// Load settings when page loads
loadSettings(); 