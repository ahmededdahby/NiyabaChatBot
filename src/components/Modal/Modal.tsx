import React, { useState } from "react";
import "./Modal.css";
import ChatBot from "../ChatBot/ChatBot";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import ChatSettings from "../ChatSettings/ChatSettings";

const Modal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [OpenChat, setOpenChat] = useState(false);
  const [LanguageSelect, setLanguageSelect] = useState(false);
  const [ViewSettings, setViewSettings] = useState(false);



  const openChat = () => setIsModalOpen(true);

  const closeChat = () => {
    setIsModalOpen(false), setOpenChat(false);
  };
  return (
    <>
      <button onClick={openChat} className="chatbot-button" id="chatbotBtn">
        <svg
          width="64"
          height="40"
          viewBox="0 0 64 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0.300537 15.21V17.0846C0.300537 18.9592 1.88205 20.5408 3.75665 20.5408H5.13751V11.7539H3.75665C1.88205 11.7539 0.300537 13.2351 0.300537 15.21Z"
            fill="white"
          />
          <path
            d="M63.6998 16.9836V15.109C63.6998 13.2344 62.1183 11.6529 60.2437 11.6529H58.8628V20.4397H60.2437C62.1183 20.4397 63.6998 18.9585 63.6998 16.9836Z"
            fill="white"
          />
          <path
            d="M46.9129 0.000132223H17.0886C11.6576 0.000132223 7.21399 4.44371 7.21399 9.87474V22.218C7.21399 27.649 11.6576 32.0926 17.0886 32.0926H19.5572H19.6575H19.7578H19.8581C19.9584 32.0926 19.9584 32.1929 20.0548 32.1929L20.2554 32.3935C20.2554 32.3935 20.3557 32.4938 20.3557 32.5902C20.3557 32.5902 20.3557 32.6905 20.456 32.7869V32.9836V33.0839V33.1842V33.2845L18.6778 40L27.8619 32.297C27.8619 32.297 27.9622 32.297 27.9622 32.1967C28.0625 32.1967 28.0625 32.0965 28.1589 32.0965H28.3557H28.4559H47.0212C52.4522 32.0965 56.8958 27.6529 56.8958 22.2218L56.8842 9.87464C56.8842 4.4436 52.4407 0.000132223 46.9129 0.000132223ZM46.4191 22.1212C44.9379 23.6024 42.963 24.4896 40.7914 24.5899H23.7073C18.9667 24.5899 15.2136 20.7404 15.2136 16.0961C15.2136 13.8242 16.1008 11.6526 17.6823 10.071C19.2638 8.48953 21.4354 7.60239 23.7073 7.60239H40.3935C45.1341 7.60239 48.8872 11.4519 48.8872 16.0961C48.8872 18.3681 47.9968 20.5397 46.4191 22.1212Z"
            fill="white"
          />
          <path
            d="M40.3932 9.48178H23.6064C21.8282 9.48178 20.2506 10.1722 18.9661 11.3564C17.6816 12.6409 16.9912 14.2184 16.9912 15.9967C16.9912 19.6495 19.9536 22.6119 23.6064 22.6119H40.6905C42.272 22.5116 43.8495 21.8211 44.9373 20.7373C46.2218 19.4528 46.9123 17.8752 46.9123 16.097C46.9123 12.4442 43.9497 9.48178 40.3932 9.48178ZM23.7071 19.4532C21.8325 19.4532 20.3513 17.972 20.3513 16.0974C20.3513 14.2228 21.8325 12.7416 23.7071 12.7416C25.5817 12.7416 27.0629 14.2228 27.0629 16.0974C27.0629 17.972 25.5817 19.4532 23.7071 19.4532ZM40.2935 19.4532C38.4189 19.4532 36.9377 17.972 36.9377 16.0974C36.9377 14.2228 38.4189 12.7416 40.2935 12.7416C42.1681 12.7416 43.6493 14.2228 43.6493 16.0974C43.6532 17.972 42.1719 19.4532 40.2935 19.4532Z"
            fill="white"
          />
          <path
            d="M23.7074 14.7163C22.9167 14.7163 22.3265 15.3104 22.3265 16.0972C22.3265 16.8879 22.9206 17.4781 23.7074 17.4781C24.4981 17.4781 25.0883 16.8841 25.0883 16.0972C25.0883 15.3065 24.4943 14.7163 23.7074 14.7163Z"
            fill="white"
          />
          <path
            d="M40.2926 14.7163C39.5019 14.7163 38.9117 15.3104 38.9117 16.0972C38.9117 16.8879 39.5058 17.4781 40.2926 17.4781C41.0833 17.4781 41.6735 16.8841 41.6735 16.0972C41.6773 15.3065 41.0833 14.7163 40.2926 14.7163Z"
            fill="white"
          />
        </svg>
      </button>
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content landing-modal">
            <div className=" modal-body landing-modal">
              <div className="flex-centre">
                <img
                  style={{ width: "100px", height: "100px" }}
                  src="/images/logo.png"
                  alt="Slide 1"
                />
                <img
                  style={{
                    width: "220px",
                    height: "310px",
                    margin: "0px 0px 0px 45px",
                  }}
                  className="fit-image"
                  src="/images/khuna.png"
                  alt="Slide 1"
                />
                <h1 className="marhaba">!مرحباً</h1>
                <p className="ana-chekam" style={{ textAlign: "center" }}>
                  أنا مساعد الشكايات الرقمي. سأرافقك خطوة بخطوة لتقديم شكوى
                  بطريقة سهلة، آمنة وسرّية.
                </p>
                <button
                  onClick={() => setOpenChat(true)}
                  className="start-conv"
                >
                  ابدأ المحادثة الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {OpenChat && (
        <div className="modal-overlay ">
          <div className="modal-content modal-chat">
            {!LanguageSelect && !ViewSettings && <ChatBot closeChat={closeChat} openLanguageSelect={()=>setLanguageSelect(true)} openSettings={()=>setViewSettings(true)} />}
            {LanguageSelect && <LanguageSelector panelControl={(value:boolean)=>setLanguageSelect(value)}/>}
            {ViewSettings && <ChatSettings closeSettings={()=>setViewSettings(false)}/>}
          </div>
        </div>
      )}
    </>
  );
};

export default Modal;
