import { useEffect, useRef, useState } from "react";
import "./ChatBot.css";
import { downsampleBuffer } from "../helpers/downsampleBuffer";
import { encodeWAV } from "../helpers/encodeWAV";
interface ChatBotProps {
  closeChat: () => void;
  openLanguageSelect: () => void;
  openSettings: () => void;
}
interface ChatMessage {
  sender: "user" | "bot";
  text: string;
}
const API_BASE_URL = "https://chikayaapi.azurewebsites.net";
const TARGET_SAMPLE_RATE = 16000;

const ChatBot: React.FC<ChatBotProps> = ({
  closeChat,
  openLanguageSelect,
  openSettings,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: "bot", text: "مرحبًا! كيف يمكنني مساعدتك اليوم؟" },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([]);
  const [speechUnsupportedNotified, setSpeechUnsupportedNotified] =
    useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;

    const updateVoices = () => {
      const voices = synth.getVoices();
      if (voices.length > 0) {
        setVoiceList(voices);
      }
    };

    updateVoices();
    synth.addEventListener("voiceschanged", updateVoices);
    return () => {
      synth.removeEventListener("voiceschanged", updateVoices);
    };
  }, [speechSupported]);
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://chikayaapi.azurewebsites.net/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            ...(conversationId && { conversation_id: conversationId }),
          }),
        }
      );

      const data = await response.json();

      if (data.reply) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "حدث خطأ أثناء الاتصال بالخادم. حاول لاحقًا." },
      ]);
    } finally {
      setLoading(false);
    }
  };
  const sendTextToChat = async (userMessage: string) => {
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          ...(conversationId && { conversation_id: conversationId }),
        }),
      });

      const data = await response.json();

      if (data.reply) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "لم نتلق ردًا من الخادم." },
        ]);
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "حدث خطأ أثناء الاتصال بالخادم. حاول لاحقًا." },
      ]);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    await startRecording();
  };
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "هذا المتصفح لا يدعم التسجيل الصوتي." },
      ]);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];

        if (!chunks.length) {
          setMessages((prev) => [
            ...prev,
            { sender: "bot", text: "لم نلتقط أي صوت. حاولي مرة أخرى." },
          ]);
          return;
        }

        const mimeType = recorder.mimeType || "audio/webm";
        const audioBlob = new Blob(chunks, { type: mimeType });
        void handleAudioMessage(audioBlob);
      });

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "تعذر الوصول إلى الميكروفون. تأكدي من منح الإذن.",
        },
      ]);
    }
  };

  const handleAudioMessage = async (rawBlob: Blob) => {
    try {
      setLoading(true);
      const wavBlob = await convertBlobToWav(rawBlob);

      const formData = new FormData();
      formData.append("audio", wavBlob, "voice-input.wav");
      formData.append("language", "ar-MA");

      const response = await fetch(`${API_BASE_URL}/audio/transcribe`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.text) {
        const errorText =
          (data && data.error) ||
          "لم نتمكن من فهم الصوت. حاولي التحدث بوضوح أكبر.";
        setMessages((prev) => [...prev, { sender: "bot", text: errorText }]);
        return;
      }

      const transcript = (data.text as string).trim();
      if (!transcript) {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "لم نتمكن من فهم الصوت. حاولي مرة أخرى." },
        ]);
        return;
      }

      await sendTextToChat(transcript);
    } catch (error) {
      console.error("Error handling audio message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "تعذر معالجة التسجيل الصوتي حالياً." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const convertBlobToWav = async (blob: Blob): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    let audioContext = audioContextRef.current;
    if (!audioContext) {
      audioContext = new AudioContext();
      audioContextRef.current = audioContext;
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData =
      audioBuffer.numberOfChannels > 0
        ? audioBuffer.getChannelData(0)
        : new Float32Array(audioBuffer.length);

    const downsampled = downsampleBuffer(
      channelData,
      audioBuffer.sampleRate,
      TARGET_SAMPLE_RATE
    );
    const wavBuffer = encodeWAV(downsampled, TARGET_SAMPLE_RATE);
    return new Blob([wavBuffer], { type: "audio/wav" });
  };

  const stopSpeech = () => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeakingIndex(null);
  };

  const speakMessage = (text: string, index: number) => {
    if (!speechSupported) {
      if (!speechUnsupportedNotified) {
        setSpeechUnsupportedNotified(true);
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "تحويل النص إلى كلام غير مدعوم في هذا المتصفح.",
          },
        ]);
      }
      return;
    }

    if (speakingIndex === index) {
      stopSpeech();
      return;
    }

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const preferredVoice =
      voiceList.find(
        (voice) =>
          voice.lang?.toLowerCase().startsWith("ar") ||
          /arabic|darija|moroccan/i.test(voice.name)
      ) || voiceList[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang || "ar-MA";
    } else {
      utterance.lang = "ar-MA";
    }

    utterance.onend = () => {
      setSpeakingIndex(null);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setSpeakingIndex(null);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      stopSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <div className="modal-header">
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="close-button" onClick={openSettings}>
            <svg
              width="52"
              height="52"
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="52" height="52" rx="26" fill="white" />
              <path
                d="M15.5 23C13.85 23 12.5 24.35 12.5 26C12.5 27.65 13.85 29 15.5 29C17.15 29 18.5 27.65 18.5 26C18.5 24.35 17.15 23 15.5 23ZM36.5 23C34.85 23 33.5 24.35 33.5 26C33.5 27.65 34.85 29 36.5 29C38.15 29 39.5 27.65 39.5 26C39.5 24.35 38.15 23 36.5 23ZM26 23C24.35 23 23 24.35 23 26C23 27.65 24.35 29 26 29C27.65 29 29 27.65 29 26C29 24.35 27.65 23 26 23Z"
                fill="#3B4E51"
              />
            </svg>
          </button>
          <button className="close-button" onClick={openLanguageSelect}>
            <svg
              width="52"
              height="52"
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="52" height="52" rx="26" fill="white" />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M16.0278 25.25C16.217 22.7347 17.3497 20.3839 19.199 18.6685C21.0483 16.9531 23.4775 16 25.9998 16C25.1698 16 24.4298 16.364 23.8198 16.921C23.2148 17.475 22.7038 18.249 22.2898 19.163C21.8738 20.083 21.5498 21.159 21.3308 22.326C21.1532 23.2915 21.0469 24.2688 21.0128 25.25H16.0278ZM16.0278 26.75H21.0128C21.0488 27.752 21.1558 28.738 21.3308 29.674C21.5508 30.841 21.8738 31.917 22.2898 32.837C22.7038 33.751 23.2148 34.525 23.8198 35.079C24.4298 35.636 25.1698 36 25.9998 36C20.7298 36 16.4108 31.923 16.0278 26.75Z"
                fill="#3B4E51"
              />
              <path
                d="M25.9998 17.395C25.7248 17.395 25.3698 17.512 24.9568 17.89C24.5408 18.271 24.1238 18.868 23.7558 19.681C23.3898 20.489 23.0928 21.464 22.8888 22.554C22.7288 23.412 22.6288 24.322 22.5928 25.25H29.4068C29.3742 24.3453 29.2753 23.4442 29.1108 22.554C28.9068 21.464 28.6108 20.489 28.2438 19.681C27.8758 18.868 27.4598 18.271 27.0438 17.891C26.6298 17.512 26.2748 17.395 25.9998 17.395ZM22.8888 29.446C23.0928 30.536 23.3898 31.511 23.7558 32.319C24.1238 33.132 24.5408 33.729 24.9558 34.109C25.3698 34.488 25.7258 34.605 25.9998 34.605C26.2748 34.605 26.6298 34.488 27.0428 34.11C27.4598 33.729 27.8758 33.132 28.2438 32.319C28.6098 31.511 28.9068 30.536 29.1108 29.446C29.2718 28.588 29.3718 27.678 29.4068 26.75H22.5928C22.6278 27.678 22.7278 28.588 22.8888 29.446Z"
                fill="#3B4E51"
              />
              <path
                d="M26 16C26.831 16 27.57 16.364 28.18 16.921C28.785 17.475 29.297 18.249 29.71 19.163C30.127 20.083 30.45 21.159 30.669 22.326C30.844 23.262 30.951 24.248 30.987 25.25H35.972C35.7828 22.7347 34.6501 20.3839 32.8008 18.6685C30.9516 16.9531 28.5224 16 26 16ZM30.669 29.674C30.45 30.841 30.127 31.917 29.71 32.837C29.297 33.751 28.785 34.525 28.18 35.079C27.57 35.636 26.831 36 26 36C31.27 36 35.589 31.923 35.972 26.75H30.987C30.9529 27.7312 30.8466 28.7085 30.669 29.674Z"
                fill="#3B4E51"
              />
            </svg>
          </button>
        </div>

        <h2 style={{ color: "#3B4E51", fontFamily: "Cairo" }}>
          مساعد الشكايات
        </h2>
        <button className="close-button" onClick={closeChat}>
          <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="52" height="52" rx="26" fill="white" />
            <rect
              x="12"
              y="24.5"
              width="28"
              height="3"
              rx="1.5"
              fill="#3B4E51"
            />
          </svg>
        </button>
      </div>

      <div className="modal-body">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.sender}`}>
            {msg.sender === "bot" && (
              <div
                className="bot-icon"
                dangerouslySetInnerHTML={{
                  __html: `
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="16" transform="matrix(-1 0 0 1 32 0)" fill="url(#paint0_linear_101_1732)"/>
          <path d="M6.49048 14.5627V15.125C6.49048 15.6874 6.96492 16.1618 7.52727 16.1618H7.94152V13.5259H7.52727C6.96492 13.5259 6.49048 13.9702 6.49048 14.5627Z" fill="white"/>
          <path d="M25.5094 15.0948V14.5324C25.5094 13.97 25.035 13.4956 24.4726 13.4956H24.0583V16.1316H24.4726C25.035 16.1316 25.5094 15.6872 25.5094 15.0948Z" fill="white"/>
          <path d="M20.4734 10H11.5265C9.89723 10 8.56421 11.3331 8.56421 12.9623V16.6651C8.56421 18.2944 9.89723 19.6274 11.5265 19.6274H12.267H12.2971H12.3272H12.3573C12.3874 19.6274 12.3874 19.6575 12.4163 19.6575L12.4765 19.7177C12.4765 19.7177 12.5066 19.7477 12.5066 19.7767C12.5066 19.7767 12.5066 19.8068 12.5367 19.8357V19.8947V19.9248V19.9549V19.985L12.0032 21.9995L14.7584 19.6887C14.7584 19.6887 14.7884 19.6887 14.7884 19.6586C14.8185 19.6586 14.8185 19.6286 14.8475 19.6286H14.9065H14.9366H20.5059C22.1352 19.6286 23.4682 18.2955 23.4682 16.6663L23.4647 12.9623C23.4647 11.333 22.1317 10 20.4734 10ZM20.3253 16.6361C19.881 17.0804 19.2885 17.3466 18.6371 17.3767H13.512C12.0899 17.3767 10.964 16.2219 10.964 14.8286C10.964 14.1471 11.2301 13.4956 11.7046 13.0212C12.179 12.5468 12.8305 12.2806 13.512 12.2806H18.5177C19.9398 12.2806 21.0657 13.4354 21.0657 14.8286C21.0657 15.5102 20.7986 16.1617 20.3253 16.6361Z" fill="white"/>
          <path d="M18.5179 12.8442H13.482C12.9486 12.8442 12.4753 13.0514 12.09 13.4066C11.7047 13.7919 11.4976 14.2652 11.4976 14.7986C11.4976 15.8944 12.3862 16.7831 13.482 16.7831H18.6071C19.0815 16.753 19.5548 16.5459 19.8811 16.2208C20.2664 15.8354 20.4735 15.3622 20.4735 14.8287C20.4735 13.7329 19.5848 12.8442 18.5179 12.8442ZM13.5123 15.8355C12.9499 15.8355 12.5056 15.3912 12.5056 14.8288C12.5056 14.2665 12.9499 13.8221 13.5123 13.8221C14.0746 13.8221 14.519 14.2665 14.519 14.8288C14.519 15.3912 14.0746 15.8355 13.5123 15.8355ZM18.488 15.8355C17.9256 15.8355 17.4813 15.3912 17.4813 14.8288C17.4813 14.2665 17.9256 13.8221 18.488 13.8221C19.0503 13.8221 19.4947 14.2665 19.4947 14.8288C19.4958 15.3912 19.0515 15.8355 18.488 15.8355Z" fill="white"/>
          <path d="M13.5124 14.4146C13.2752 14.4146 13.0981 14.5927 13.0981 14.8288C13.0981 15.066 13.2763 15.243 13.5124 15.243C13.7496 15.243 13.9266 15.0648 13.9266 14.8288C13.9266 14.5916 13.7484 14.4146 13.5124 14.4146Z" fill="white"/>
          <path d="M18.4875 14.4146C18.2503 14.4146 18.0732 14.5927 18.0732 14.8288C18.0732 15.066 18.2514 15.243 18.4875 15.243C18.7247 15.243 18.9017 15.0648 18.9017 14.8288C18.9029 14.5916 18.7247 14.4146 18.4875 14.4146Z" fill="white"/>
          <defs>
            <linearGradient id="paint0_linear_101_1732" x1="16.0364" y1="54" x2="16.0364" y2="-8.33333" gradientUnits="userSpaceOnUse">
              <stop offset="0.277305" stop-color="#3B4E51"/>
              <stop offset="1" stop-color="#E9C469"/>
            </linearGradient>
          </defs>
        </svg>
      `,
                }}
              />
            )}
            <div className="message-bubble">{msg.text}</div>
            {msg.sender === "bot" && (
              <button
                className={`speak-button ${
                  speakingIndex === index ? "playing" : ""
                }`}
                onClick={() => speakMessage(msg.text, index)}
                title={
                  speakingIndex === index
                    ? "إيقاف القراءة الصوتية"
                    : "تشغيل القراءة الصوتية"
                }
                aria-label={
                  speakingIndex === index
                    ? "إيقاف القراءة الصوتية"
                    : "تشغيل القراءة الصوتية"
                }
              >
                <span aria-hidden="true">🔊</span>
              </button>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-message bot">
            <div className="message-bubble">...</div>
          </div>
        )}
      </div>

      <div className="modal-footer">
        {!isRecording &&<button
          className="send-button"
          onClick={sendMessage}
          disabled={loading || isRecording}
        >
          <svg
            width="21"
            height="21"
            viewBox="0 0 21 21"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M20.155 20.2553C20.0057 20.385 19.8213 20.4675 19.6252 20.4924C19.429 20.5173 19.2299 20.4835 19.053 20.3953L1.05295 11.3953C0.886544 11.3124 0.746555 11.1847 0.648704 11.0266C0.550853 10.8685 0.499017 10.6863 0.499017 10.5003C0.499017 10.3144 0.550853 10.1321 0.648704 9.97404C0.746554 9.81595 0.886544 9.68826 1.05295 9.60532L19.053 0.605318C19.2299 0.516785 19.4291 0.482729 19.6254 0.507456C19.8217 0.532183 20.0063 0.614582 20.1557 0.744228C20.3052 0.873875 20.4128 1.04494 20.465 1.23578C20.5172 1.42662 20.5116 1.62865 20.449 1.81632L17.887 9.50032L12.5 9.50032C12.2347 9.50032 11.9804 9.60568 11.7928 9.79321C11.6053 9.98075 11.5 10.2351 11.5 10.5003C11.5 10.7655 11.6053 11.0199 11.7928 11.2074C11.9804 11.395 12.2347 11.5003 12.5 11.5003L17.887 11.5003L20.45 19.1843C20.5123 19.3719 20.5176 19.5738 20.4653 19.7644C20.413 19.955 20.3043 20.1258 20.155 20.2553Z"
              fill="white"
            />
          </svg>
        </button>}
        <button
          style={{ border: "none", background: "none" }}
          className={`close-button ${isRecording ? "recording" : ""}`}
          onClick={toggleRecording}
          title={isRecording ? "إيقاف التسجيل" : "تسجيل رسالة صوتية"}
          disabled={loading}
        >
          {isRecording ? (
            <svg
              width="55"
              height="55"
              viewBox="0 0 55 55"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                width="55"
                height="55"
                rx="27.5"
                transform="matrix(-1 0 0 1 55 0)"
                fill="url(#paint0_linear_185_623)"
              />
              <path
                d="M31 21C31 19.067 29.433 17.5 27.5 17.5C25.567 17.5 24 19.067 24 21V27.5C24 29.433 25.567 31 27.5 31C29.433 31 31 29.433 31 27.5V21Z"
                fill="white"
                stroke="white"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <path
                d="M20 27C20 31.142 23.358 34.5 27.5 34.5M27.5 34.5C31.642 34.5 35 31.142 35 27M27.5 34.5V37.5"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <defs>
                <linearGradient
                  id="paint0_linear_185_623"
                  x1="27.5626"
                  y1="92.8125"
                  x2="27.5626"
                  y2="-14.3229"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0.277305" stop-color="#3B4E51" />
                  <stop offset="1" stop-color="#E9C469" />
                </linearGradient>
              </defs>
            </svg>
          ) : (
            <svg
              width="55"
              height="55"
              viewBox="0 0 55 55"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="-0.5"
                y="0.5"
                width="54"
                height="54"
                rx="27"
                transform="matrix(-1 0 0 1 54 0)"
                fill="white"
              />
              <rect
                x="-0.5"
                y="0.5"
                width="54"
                height="54"
                rx="27"
                transform="matrix(-1 0 0 1 54 0)"
                stroke="#898989"
              />
              <path
                d="M38.0001 41.5006H36V38.5005H31.9998C30.6742 38.4989 29.4032 37.9716 28.4659 37.0342C27.5285 36.0968 27.0012 34.8259 26.9996 33.5003V32.2202L24.6835 31.4492C24.5415 31.4018 24.4119 31.3231 24.3044 31.2189C24.1968 31.1148 24.114 30.9878 24.0621 30.8474C24.0101 30.707 23.9904 30.5567 24.0043 30.4076C24.0182 30.2585 24.0654 30.1145 24.1425 29.9861L26.9996 25.2229V22.4998C27.0022 20.1136 27.9513 17.8258 29.6387 16.1385C31.326 14.4512 33.6137 13.5021 36 13.4994H41.0002V15.4995H36C34.1442 15.5021 32.3652 16.2405 31.0529 17.5528C29.7407 18.865 29.0023 20.644 28.9997 22.4998V25.4999C28.9994 25.681 28.95 25.8587 28.8567 26.0139L26.4996 29.9461L28.3166 30.5511C28.5157 30.6177 28.6887 30.7451 28.8113 30.9154C28.9339 31.0857 28.9998 31.2903 28.9997 31.5002V33.5003C29.0005 34.2957 29.3168 35.0583 29.8793 35.6208C30.4417 36.1832 31.2044 36.4996 31.9998 36.5004H37C37.2652 36.5004 37.5196 36.6057 37.7072 36.7933C37.8947 36.9808 38.0001 37.2352 38.0001 37.5004V41.5006Z"
                fill="#898989"
              />
              <path
                d="M30.9993 23.4998H34.9995V25.4999H30.9993V23.4998ZM21.3319 36.7174C20.598 36.0608 20.0108 35.2567 19.6088 34.3577C19.2068 33.4587 18.999 32.485 18.999 31.5002C18.999 30.5154 19.2068 29.5417 19.6088 28.6426C20.0108 27.7436 20.598 26.9396 21.3319 26.2829L22.665 27.773C22.1407 28.242 21.7213 28.8164 21.4341 29.4585C21.147 30.1007 20.9985 30.7962 20.9985 31.4997C20.9985 32.2031 21.147 32.8986 21.4341 33.5408C21.7213 34.183 22.1407 34.7573 22.665 35.2263L21.3319 36.7174Z"
                fill="#898989"
              />
              <path
                d="M18.3989 40.3007C17.033 39.2758 15.9245 37.947 15.161 36.4196C14.3975 34.8921 14 33.2079 14 31.5003C14 29.7927 14.3975 28.1085 15.161 26.5811C15.9245 25.0536 17.033 23.7249 18.3989 22.6999L19.5989 24.3C18.4809 25.1384 17.5735 26.2255 16.9485 27.4754C16.3235 28.7252 15.9981 30.1034 15.9981 31.5008C15.9981 32.8982 16.3235 34.2764 16.9485 35.5263C17.5735 36.7761 18.4809 37.8633 19.5989 38.7016L18.3989 40.3007Z"
                fill="#898989"
              />
            </svg>
          )}
        </button>
        <div className="input-container">
          <button className="attach-btn" title="إرفاق ملف">
            <svg
              width="35"
              height="35"
              viewBox="0 0 35 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14.771 13.125V22.9585C14.7824 23.6776 15.076 24.3633 15.5885 24.8678C16.101 25.3723 16.7913 25.6551 17.5105 25.6551C18.2297 25.6551 18.92 25.3723 19.4325 24.8678C19.945 24.3633 20.2386 23.6776 20.25 22.9585L20.2589 10.0693C20.2663 9.45473 20.1517 8.84477 19.9217 8.27479C19.6917 7.70482 19.3508 7.18618 18.9188 6.74893C18.4868 6.31168 17.9723 5.96453 17.4052 5.72759C16.8381 5.49066 16.2295 5.36865 15.6149 5.36865C15.0002 5.36865 14.3917 5.49066 13.8246 5.72759C13.2574 5.96453 12.743 6.31168 12.311 6.74893C11.879 7.18618 11.5381 7.70482 11.3081 8.27479C11.0781 8.84477 10.9634 9.45473 10.9709 10.0693V23.0453C10.9584 23.9106 11.118 24.7697 11.4404 25.5727C11.7629 26.3757 12.2418 27.1067 12.8492 27.723C13.4567 28.3393 14.1806 28.8287 14.9789 29.1627C15.7771 29.4968 16.6339 29.6688 17.4992 29.6688C18.3646 29.6688 19.2213 29.4968 20.0196 29.1627C20.8178 28.8287 21.5417 28.3393 22.1492 27.723C22.7567 27.1067 23.2355 26.3757 23.558 25.5727C23.8805 24.7697 24.0401 23.9106 24.0275 23.0453V10.9197"
                stroke="#898989"
                stroke-width="2"
                stroke-miterlimit="10"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <input
            type="text"
            placeholder="أكتب رسالتك هنا"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </div>{" "}
      </div>
    </>
  );
};

export default ChatBot;
