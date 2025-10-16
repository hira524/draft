# AI Pronunciation Tutor Game

## Project Overview
A real-time AI-powered pronunciation tutor game for children that uses WebSocket streaming, Deepgram STT/TTS, OpenAI GPT-5, and MongoDB to create an interactive voice learning experience.

## Architecture
- **Frontend**: React + TypeScript with Web Audio API for microphone capture and audio playback
- **Backend**: Node.js + Express + WebSocket server for real-time bidirectional communication
- **Database**: MongoDB for storing child profiles, interests, and game sessions
- **AI Services**: 
  - OpenAI GPT-5 for word generation and contextual feedback
  - Deepgram for streaming Speech-to-Text and Text-to-Speech
- **Phonetic Analysis**: Custom engine using metaphone, natural, and string-similarity libraries

## Key Features
1. **Real-time Voice Interaction**: Continuous audio streaming with <500ms latency
2. **Personalized Word Lists**: OpenAI generates words based on child's interests
3. **Advanced Pronunciation Scoring**: Phoneme-level analysis with Deepgram confidence
4. **Intelligent Feedback**: Contextual, encouraging AI responses
5. **Game State Management**: Barge-in protection, attempt tracking, progression logic
6. **Child-Friendly UI**: Colorful design, animations, visual feedback

## Game Flow
1. Child enters name → WebSocket connects → Fetch interests from DB
2. OpenAI generates personalized word list (15-20 words)
3. AI greets child via Deepgram TTS streaming
4. For each word:
   - AI introduces word with pronunciation guidance
   - Child speaks into microphone (20ms audio chunks)
   - Deepgram STT transcribes speech
   - Phonetic analysis calculates score
   - OpenAI generates feedback based on performance
   - Deepgram TTS streams feedback audio
   - Award points or retry (max 3 attempts)
5. Game completion with summary

## State Management
- `botIsSpeaking`: AI is outputting TTS (blocks listening)
- `botIsBusy`: Processing/analyzing (prevents concurrent requests)
- `waitingForChildResponse`: Expecting child's pronunciation attempt
- `attemptCount`: Current word attempts (0-3)
- `currentWordIndex`: Progress through word list

## Technical Specifications
- **Audio Format**: Linear16 PCM at 16kHz, mono, 16-bit
- **Chunk Size**: 20ms (320 bytes)
- **WebSocket Path**: `/ws`
- **Scoring Formula**: `baseScore = (phonemeSimilarity * 0.6) + (deepgramConfidence * 0.4)`
- **Success Threshold**: 80% for perfect, 60-79% for partial, <60% needs retry

## Environment Variables
- `OPENAI_API_KEY`: OpenAI API key for GPT-5
- `DEEPGRAM_API_KEY`: Deepgram API key for STT/TTS
- `MONGODB_URI`: MongoDB connection string

## Recent Changes
- 2025-01-16: Initial project setup with complete schema and frontend components
- Child-friendly design system with Fredoka and Bubblegum Sans fonts
- Real-time game interface with microphone visualizer and progress tracking
- Theme support (light/dark mode) with playful color palette
