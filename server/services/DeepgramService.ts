import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export class DeepgramService {
  private deepgram;

  constructor() {
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
  }

  // Create STT (Speech-to-Text) connection
  async createSTTConnection(onTranscript: (transcript: string, isFinal: boolean, confidence: number) => void) {
    const connection = this.deepgram.listen.live({
      model: "nova-2",
      language: "en-US",
      smart_format: true,
      interim_results: true,
      endpointing: 300,
      encoding: "linear16",
      sample_rate: 16000,
      channels: 1,
    });

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log("Deepgram STT connection opened");
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript || "";
      const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
      const isFinal = data.is_final || false;

      if (transcript && transcript.trim()) {
        onTranscript(transcript, isFinal, confidence);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      console.error("Deepgram STT error:", error);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("Deepgram STT connection closed");
    });

    return connection;
  }

  // Generate TTS (Text-to-Speech) audio
  async generateTTS(text: string): Promise<Buffer> {
    try {
      const response = await this.deepgram.speak.request(
        { text },
        {
          model: "aura-luna-en",
          encoding: "linear16",
          sample_rate: 16000,
          container: "wav",
        }
      );

      const stream = await response.getStream();
      if (!stream) {
        throw new Error("No stream returned from Deepgram TTS");
      }

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Deepgram TTS error:", error);
      throw error;
    }
  }
}
