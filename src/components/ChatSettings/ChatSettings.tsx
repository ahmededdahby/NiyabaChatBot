import { useState } from "react";
import "./ChatSettings.css";
interface ChatSettingsProps {
  closeSettings: () => void;
}
const features = ["التباين العالي", "القراءة الصوتية", "الإدخال الصوتي"];

const ChatSettings: React.FC<ChatSettingsProps> = ({ closeSettings }) => {
  const [selectedSetting, setSelectedSetting] = useState<string[]>([]);
    const [fontSize, setFontSize] = useState<number>(16);
  const handleCheck = (lang: string) => {
    setSelectedSetting((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  return (
    <>
      <div className="header">
        <h1>إعدادات إمكانية الوصول</h1>
        <button onClick={closeSettings}>
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
              d="M23.1218 25.9999L30.782 33.6602L29.2502 35.192L20.824 26.7659C20.6209 26.5627 20.5068 26.2872 20.5068 25.9999C20.5068 25.7127 20.6209 25.4372 20.824 25.234L29.2502 16.8079L30.782 18.3397L23.1218 25.9999Z"
              fill="#3B4E51"
            />
          </svg>
        </button>
      </div>
      <div className="body">
        {/* Font size slider */}
          <label className="slider-item" style={{flexDirection:"column",alignItems:"flex-end",justifyContent:"center"}}>
            <span>حجم الخط</span>
            <input
                className="slider"
              type="range"
              min="10"
              max="30"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </label>
        <div className="languages-box">
          {features.map((lang) => (
            <label key={lang} className="lang-item">
              <span>{lang}</span>
              <input
                type="checkbox"
                checked={selectedSetting.includes(lang)}
                onChange={() => handleCheck(lang)}
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
};

export default ChatSettings;
