import React from 'react';
import browser from 'webextension-polyfill';

interface NotificationContainerProps {
  id: string;
  borderColor: string;
  title: string;
  content: string;
  buttonText: string;
  onButtonClick: () => void;
  onClose: () => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  id,
  borderColor,
  title,
  content,
  buttonText,
  onButtonClick,
  onClose
}) => {
  return (
    <div 
      className="cicd-workflow-in-page-notification"
      id={`cicd-notification-${id}`}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        backgroundColor: "#fff",
        color: "#24292e",
        padding: "16px",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 9999,
        maxWidth: "350px",
        border: "1px solid #e1e4e8",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        borderLeft: `4px solid ${borderColor}`
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img 
          src={browser.runtime.getURL("images/icon-48.png")} 
          alt="Notification icon"
          style={{ width: "24px", height: "24px" }}
        />
        <div style={{ fontWeight: 600, fontSize: "16px", flexGrow: 1 }}>{title}</div>
        <button 
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#24292e",
            fontSize: "20px",
            padding: 0,
            cursor: "pointer",
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ fontSize: "14px", lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: content }} />
      
      <button 
        onClick={onButtonClick}
        style={{
          background: "#2ea44f",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "8px 16px",
          cursor: "pointer",
          fontWeight: 500,
          fontSize: "14px",
          marginTop: "8px",
          alignSelf: "flex-start"
        }}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default NotificationContainer;