let speechConfig;
let micRecognizer;
let speakerRecognizer;
let isRecording = false;
let currentMessageDiv = null;
let audioStream = null;
let speakerStream = null;
let audioContext = null;
let analyser = null;
let lastSource = null;
let currentSource = null;
let lastRecognizedSource = null;
let recognitionSession = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 1000; // 1 second
const RESTART_DELAY = 2000; // Increased to 2 seconds
const SILENCE_CHECK_INTERVAL = 2000; // Increased to 2 seconds
let isRestarting = false;
let silenceCheckInterval = null;

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const regionInput = document.getElementById('region');
const saveSettingsBtn = document.getElementById('saveSettings');
const startRecordingBtn = document.getElementById('startRecording');
const stopRecordingBtn = document.getElementById('stopRecording');
const transcriptionBox = document.getElementById('transcriptionBox');
const audioSourceSelect = document.getElementById('audioSource');

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
    
    // Increase silence timeouts for better continuous recognition
    speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "20000");
    speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "20000");
    speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, "2000");
    
    return true;
}

// Create a new message container
function createNewMessage(source) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${source.toLowerCase()}`;
    
    const textContent = document.createElement('div');
    textContent.className = 'text-content';
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(textContent);
    messageDiv.appendChild(timestamp);
    transcriptionBox.appendChild(messageDiv);
    
    transcriptionBox.scrollTop = transcriptionBox.scrollHeight;
    
    return messageDiv;
}

// Add message to transcription box
function addMessage(text, source) {
    const messageDiv = createNewMessage(source);
    const textContent = messageDiv.querySelector('.text-content');
    textContent.textContent = text;
    return messageDiv;
}

// Get speaker audio stream
async function getSpeakerAudioStream() {
    try {
        // getDisplayMedia requires video:true for most browsers
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 2,
                sampleRate: 44100,
                latency: 0.01
            }
        });

        // Check if the selected tab/window has audio
        if (stream.getAudioTracks().length === 0) {
            addMessage('No audio track found in selected window/tab. Please select a tab/window with audio playing.', 'system');
            addMessage('Tip: Try playing some audio in the selected tab before sharing.', 'system');
            stream.getTracks().forEach(track => track.stop());
            return null;
        }

        // If user closes the sharing, clean up
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            console.log('Speaker audio sharing stopped by user');
            addMessage('Speaker audio sharing stopped. Please restart recording to capture speaker audio again.', 'system');
            if (speakerStream) {
                speakerStream.getTracks().forEach(track => track.stop());
                speakerStream = null;
            }
        });

        console.log('Successfully captured speaker audio stream');
        return stream;
    } catch (error) {
        console.error('Error getting speaker audio:', error);
        addMessage('Error accessing speaker audio. Please make sure to select a tab/window with audio when prompted.', 'system');
        return null;
    }
}

// Setup recognizers
async function setupRecognizers() {
    try {
        // Cleanup any existing resources first
        cleanupResources();
        
        // Get microphone stream with specific constraints
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 1,
                sampleRate: 44100,
                latency: 0.01
            }
        });

        // Get speaker stream
        speakerStream = await getSpeakerAudioStream();
        if (!speakerStream) {
            console.log('Speaker audio capture not available, continuing with microphone only');
            addMessage('Continuing with microphone only. Speaker audio capture not available.', 'system');
        } else {
            addMessage('Successfully captured speaker audio. Both microphone and speaker will be transcribed.', 'system');
        }

        // Create audio configs with specific settings
        const micAudioConfig = SpeechSDK.AudioConfig.fromStreamInput(audioStream);
        
        let speakerAudioConfig = null;
        if (speakerStream) {
            // Azure SDK expects a single audio MediaStreamTrack, not the whole stream with video
            const audioTracks = speakerStream.getAudioTracks();
            if (audioTracks.length > 0) {
                // Create a new MediaStream with only the audio track
                const audioOnlyStream = new MediaStream([audioTracks[0]]);
                speakerAudioConfig = SpeechSDK.AudioConfig.fromStreamInput(audioOnlyStream);
            }
        }
        
        // Create recognizers with specific settings
        micRecognizer = new SpeechSDK.SpeechRecognizer(speechConfig, micAudioConfig);
        if (speakerAudioConfig) {
            speakerRecognizer = new SpeechSDK.SpeechRecognizer(speechConfig, speakerAudioConfig);
            console.log('Speaker recognizer created successfully');
        }
        
        // Setup event handlers
        setupRecognizerEvents(micRecognizer, 'you');
        if (speakerRecognizer) {
            setupRecognizerEvents(speakerRecognizer, 'them');
            console.log('Speaker recognizer events set up successfully');
        }

        return true;
    } catch (error) {
        console.error('Error setting up recognizers:', error);
        addMessage('Error setting up recognition. Please try again.', 'system');
        cleanupResources();
        return false;
    }
}

// Setup recognizer events
function setupRecognizerEvents(recognizer, source) {
    let interimDiv = null;
    
    recognizer.recognizing = (s, e) => {
        try {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
                console.log(`${source} recognizing:`, e.result.text);
                
                if (!interimDiv) {
                    interimDiv = addMessage(e.result.text, source);
                } else {
                    interimDiv.querySelector('.text-content').textContent = e.result.text;
                }
            }
        } catch (error) {
            console.error(`Error in ${source} recognition:`, error);
            addMessage(`Error processing ${source} recognition.`, 'system');
        }
    };

    recognizer.recognized = (s, e) => {
        try {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                console.log(`${source} recognized:`, e.result.text);
                addMessage(e.result.text, source);
                if (interimDiv) {
                    interimDiv.remove();
                    interimDiv = null;
                }
            }
        } catch (error) {
            console.error(`Error in ${source} recognition:`, error);
            addMessage(`Error processing ${source} recognition.`, 'system');
        }
    };

    recognizer.canceled = async (s, e) => {
        console.error(`${source} recognition canceled:`, e);
        if (e.reason === SpeechSDK.CancellationReason.Error) {
            console.error('Error details:', e.errorDetails);
            addMessage(`${source} recognition error: ${e.errorDetails}`, 'system');
            
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                addMessage(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`, 'system');
                
                await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
                
                if (isRecording) {
                    await restartRecognizer(source);
                }
            } else {
                console.error('Max reconnection attempts reached');
                addMessage('Max reconnection attempts reached. Please stop and start recording again.', 'system');
                isRecording = false;
                startRecordingBtn.disabled = false;
                stopRecordingBtn.disabled = true;
            }
        }
    };

    recognizer.sessionStopped = async (s, e) => {
        console.log(`${source} recognition session stopped`);
        addMessage(`${source} recognition stopped`, 'system');
        
        reconnectAttempts = 0;
        
        if (isRecording && !isRestarting) {
            isRestarting = true;
            setTimeout(async () => {
                await restartRecognizer(source);
                isRestarting = false;
            }, RESTART_DELAY);
        }
    };
}

// Add restart recognizer function
async function restartRecognizer(source) {
    try {
        console.log(`Restarting ${source} recognizer...`);
        addMessage(`Restarting ${source} recognizer...`, 'system');
        
        cleanupResources();
        
        if (await setupRecognizers()) {
            if (micRecognizer && source === 'you') {
                await micRecognizer.startContinuousRecognitionAsync();
                console.log(`${source} recognition restarted successfully`);
                addMessage(`${source} recognition restarted successfully`, 'system');
            }
            if (speakerRecognizer && source === 'them') {
                await speakerRecognizer.startContinuousRecognitionAsync();
                console.log(`${source} recognition restarted successfully`);
                addMessage(`${source} recognition restarted successfully`, 'system');
            }
        }
    } catch (error) {
        console.error(`Error restarting ${source} recognizer:`, error);
        addMessage(`Error restarting ${source} recognizer. Please try stopping and starting again.`, 'system');
        isRecording = false;
        startRecordingBtn.disabled = false;
        stopRecordingBtn.disabled = true;
    }
}

// Start recording
startRecordingBtn.addEventListener('click', async () => {
    if (!initializeSpeechConfig()) return;
    
    try {
        // Reset state variables
        reconnectAttempts = 0;
        
        // Clean up any existing resources
        cleanupResources();
        
        if (!await setupRecognizers()) return;
        
        // Start both recognizers
        const startPromises = [];
        
        // Start microphone recognition
        startPromises.push(new Promise((resolve, reject) => {
            micRecognizer.startContinuousRecognitionAsync(
                () => {
                    console.log('Microphone recognition started');
                    addMessage('Microphone recognition started', 'system');
                    resolve();
                },
                (error) => {
                    console.error('Error starting microphone recognition:', error);
                    reject(error);
                }
            );
        }));

        // Start speaker recognition if available
        if (speakerRecognizer) {
            startPromises.push(new Promise((resolve, reject) => {
                speakerRecognizer.startContinuousRecognitionAsync(
                    () => {
                        console.log('Speaker recognition started');
                        addMessage('Speaker recognition started', 'system');
                        resolve();
                    },
                    (error) => {
                        console.error('Error starting speaker recognition:', error);
                        reject(error);
                    }
                );
            }));
        }

        await Promise.all(startPromises);

        isRecording = true;
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = false;
        addMessage('Recording started...', 'system');
    } catch (error) {
        console.error('Error starting recognition:', error);
        addMessage('Error starting recognition. Please try again.', 'system');
        cleanupResources();
    }
});

// Stop recording
stopRecordingBtn.addEventListener('click', async () => {
    try {
        if (micRecognizer) {
            await micRecognizer.stopContinuousRecognitionAsync();
        }
        if (speakerRecognizer) {
            await speakerRecognizer.stopContinuousRecognitionAsync();
        }
        
        isRecording = false;
        startRecordingBtn.disabled = false;
        stopRecordingBtn.disabled = true;
        currentMessageDiv = null;
        lastSource = null;
        
        cleanupResources();
        
        addMessage('Recording stopped.', 'system');
    } catch (error) {
        console.error('Error stopping recognition:', error);
        addMessage('Error stopping recognition.', 'system');
    }
});

// Add a cleanup function
function cleanupResources() {
    try {
        if (audioStream) {
            audioStream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            audioStream = null;
        }
        
        if (speakerStream) {
            speakerStream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            speakerStream = null;
        }
        
        if (audioContext) {
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
            audioContext = null;
        }
        
        if (analyser) {
            analyser.disconnect();
            analyser = null;
        }
        
        if (micRecognizer) {
            micRecognizer.close();
            micRecognizer = null;
        }
        
        if (speakerRecognizer) {
            speakerRecognizer.close();
            speakerRecognizer = null;
        }
        
        // Reset silence timer
        silenceStartTime = null;
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

// Get available audio devices
async function getAudioDevices() {
    try {
        // Request microphone permission first
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            } 
        });
        
        // Stop the initial stream
        stream.getTracks().forEach(track => track.stop());
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        // Clear existing options
        audioSourceSelect.innerHTML = '';
        
        if (audioInputs.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.text = 'No audio devices found';
            audioSourceSelect.appendChild(option);
            audioSourceSelect.disabled = true;
            addMessage('No audio input devices found. Please connect a microphone and refresh the page.', 'system');
            return;
        }
        
        // Add options for each audio input
        audioInputs.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.text = device.label || `Microphone ${index + 1}`;
            audioSourceSelect.appendChild(option);
        });

        // Log available devices for debugging
        console.log('Available audio devices:', audioInputs.map(d => ({
            label: d.label,
            kind: d.kind
        })));

        // Enable the select element
        audioSourceSelect.disabled = false;
        
        // If we have devices, select the first one by default
        if (audioInputs.length > 0) {
            audioSourceSelect.value = '0';
            console.log('Default selected device:', audioInputs[0].label || 'Microphone 1');
            addMessage('Audio device selected: ' + (audioInputs[0].label || 'Microphone 1'), 'system');
        }

        // Add change event listener to log device changes
        audioSourceSelect.addEventListener('change', () => {
            const selectedIndex = parseInt(audioSourceSelect.value);
            const selectedDevice = audioInputs[selectedIndex];
            console.log('Device changed to:', selectedDevice.label || `Microphone ${selectedIndex + 1}`);
            addMessage('Audio device changed to: ' + (selectedDevice.label || `Microphone ${selectedIndex + 1}`), 'system');
        });
    } catch (error) {
        console.error('Error getting audio devices:', error);
        audioSourceSelect.innerHTML = '<option value="">Error accessing audio devices</option>';
        audioSourceSelect.disabled = true;
        addMessage('Error accessing audio devices. Please make sure you have granted microphone permissions and refresh the page.', 'system');
    }
}

// Load settings and audio devices when page loads
loadSettings();
getAudioDevices();

// Update the HTML to remove the toggle switch
document.querySelector('.source-toggle').innerHTML = `
    <div class="source-indicator">
        <i class="fas fa-microphone"></i>
        <span>Auto-detecting audio source...</span>
    </div>
`; 