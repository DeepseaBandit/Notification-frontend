import { useState, useEffect } from "react";

// Use environment variable with fallback to hardcoded API URL for production
const API_URL = process.env.REACT_APP_API_URL;

export default function NotificationApp() {
  const [activeTab, setActiveTab] = useState("email");
  const [userId, setUserId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState({ 
    email: [], 
    sms: [],
    inapp: []
  });
  
  // Email form state
  const [emailForm, setEmailForm] = useState({
    email: "",
    subject: "",
    body: ""
  });
  
  // SMS form state
  const [smsForm, setSmsForm] = useState({
    phoneNumber: "",
    message: ""
  });
  
  // In-app notification form state
  const [inappForm, setInappForm] = useState({
    title: "",
    message: "",
    notification_type: "info"
  });
  
  // State for notification display
  const [showNotification, setShowNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  
  // Handle email form changes
  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle SMS form changes
  const handleSmsChange = (e) => {
    const { name, value } = e.target;
    setSmsForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle in-app form changes
  const handleInappChange = (e) => {
    const { name, value } = e.target;
    setInappForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Fetch notifications on component mount and when userId changes
  useEffect(() => {
    fetchNotifications();
  }, [userId]);
  
  // Fetch all notifications
  const fetchNotifications = async () => {
    try {
      // Fetch email notifications
      const emailRes = await fetch(`${API_URL}/email/users/${userId}/notifications`);
      if (!emailRes.ok) throw new Error(`Email API responded with status: ${emailRes.status}`);
      const emailData = await emailRes.json();
      
      // Fetch SMS notifications
      const smsRes = await fetch(`${API_URL}/sms/logs/${userId}`);
      if (!smsRes.ok) throw new Error(`SMS API responded with status: ${smsRes.status}`);
      const smsData = await smsRes.json();
      
      // Fetch in-app notifications
      const inappRes = await fetch(`${API_URL}/inapp/user/${userId}`);
      if (!inappRes.ok) throw new Error(`In-app API responded with status: ${inappRes.status}`);
      const inappData = await inappRes.json();
      
      console.log("In-app notifications response:", inappData);
      
      setNotifications({
        email: emailData || [],
        sms: smsData.logs || [],
        inapp: Array.isArray(inappData) ? inappData : []
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };
  
  // Send email notification
  const sendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/email/send_email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          email: emailForm.email,
          subject: emailForm.subject,
          body: emailForm.body
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", errorText);
        throw new Error(`Failed to send email: ${response.status}`);
      }
      
      const data = await response.json();
      // Reset form and fetch updated notifications
      setEmailForm({ email: "", subject: "", body: "" });
      fetchNotifications();
      alert("Email sent successfully! Please check the spam folder of your email");
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Send SMS notification
  const sendSms = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/sms/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          to: smsForm.phoneNumber,
          body: smsForm.message
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", errorText);
        throw new Error(`Failed to send SMS: ${response.status}`);
      }
      
      const data = await response.json();
      // Reset form and fetch updated notifications
      setSmsForm({ phoneNumber: "", message: "" });
      fetchNotifications();
      
      // Check if the SMS was actually sent (based on Twilio SID)
      if (!data.sid || data.sid === null) {
        // Create a custom notification for SMS sending issues
        const smsNotification = {
          id: "sms-warning-" + Date.now(),
          title: "SMS Sending Issue",
          message: "Please start the number with country code! If it still isn't working, your number may not be verified in Twilio",
          notification_type: "warning",
          read: false,
          created_at: new Date().toISOString()
        };
        
        setCurrentNotification(smsNotification);
        setShowNotification(true);
        
        // Auto hide the notification after 7 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 7000);
      } else {
        alert("SMS sent successfully!");
      }
    } catch (error) {
      // Show the Twilio error notification
      const errorNotification = {
        id: "sms-error-" + Date.now(),
        title: "SMS Sending Error",
        message: "Please start the number with country code! If it still isn't working, your number may not be verified in Twilio",
        notification_type: "warning",
        read: false,
        created_at: new Date().toISOString()
      };
      
      setCurrentNotification(errorNotification);
      setShowNotification(true);
      
      // Auto hide the notification after 7 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 7000);
      
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Send in-app notification
  const sendInappNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/inapp/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId,
          title: inappForm.title,
          message: inappForm.message,
          notification_type: inappForm.notification_type
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server response:", errorText);
        throw new Error(`Failed to send in-app notification: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("In-app notification created:", result);
      
      // Update the notifications list directly with the new notification
      setNotifications(prev => ({
        ...prev,
        inapp: [result, ...prev.inapp]
      }));
      
      // Show the toast notification
      setCurrentNotification(result);
      setShowNotification(true);
      
      // Auto hide the notification after 5 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      // Reset form
      setInappForm({
        title: "",
        message: "",
        notification_type: "info"
      });
      
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Mark in-app notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_URL}/inapp/${notificationId}/mark-read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to mark notification as read: ${response.status}`);
      }
      
      // Update notification in the state to avoid refetching
      setNotifications(prev => ({
        ...prev,
        inapp: prev.inapp.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      }));
      
      // Hide the toast if it's the current notification
      if (currentNotification && currentNotification.id === notificationId) {
        setShowNotification(false);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  // Mark all notifications as read for current user
  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API_URL}/inapp/user/${userId}/mark-all-read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to mark all notifications as read: ${response.status}`);
      }
      
      // Update all notifications in the state to avoid refetching
      setNotifications(prev => ({
        ...prev,
        inapp: prev.inapp.map(notif => ({ ...notif, read: true }))
      }));
      
      // Hide the toast notification
      setShowNotification(false);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
  
  // Get notification type style
  const getNotificationTypeStyle = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-6">Notification System</h1>
      
      {/* API Connection Status */}
      <div className="mb-4 text-center">
        <span className="text-sm text-gray-500">
          Connected to API: {API_URL}
        </span>
      </div>
      
      {/* Toast Notification at the top center */}
      {showNotification && currentNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md animate-fade-in">
          <div className={`border shadow-lg rounded-lg overflow-hidden ${getNotificationTypeStyle(currentNotification.notification_type)}`}>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  {currentNotification.notification_type === 'success' && (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                  )}
                  {currentNotification.notification_type === 'error' && (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                    </svg>
                  )}
                  {currentNotification.notification_type === 'warning' && (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                    </svg>
                  )}
                  {currentNotification.notification_type === 'info' && (
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 7a1 1 0 100 2h2a1 1 0 100-2h-1V8a1 1 0 00-1-1h-1a1 1 0 100 2h1v4z" clipRule="evenodd"></path>
                    </svg>
                  )}
                  <h4 className="font-medium">{currentNotification.title}</h4>
                </div>
                <button 
                  onClick={() => markAsRead(currentNotification.id)}
                  className="text-gray-500 hover:text-gray-700 ml-4"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                </button>
              </div>
              <p className="text-sm mt-2">{currentNotification.message}</p>
              <div className="text-xs mt-2 text-gray-600">
                {new Date(currentNotification.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* User ID Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">User ID:</label>
        <input
          type="number"
          min="1"
          value={userId}
          onChange={(e) => setUserId(parseInt(e.target.value))}
          className="w-32 p-2 border rounded"
        />
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 ${activeTab === "email" ? "bg-blue-500 text-white" : "bg-gray-100"}`}
          onClick={() => setActiveTab("email")}
        >
          Email Notifications
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "sms" ? "bg-blue-500 text-white" : "bg-gray-100"}`}
          onClick={() => setActiveTab("sms")}
        >
          SMS Notifications
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "inapp" ? "bg-blue-500 text-white" : "bg-gray-100"}`}
          onClick={() => setActiveTab("inapp")}
        >
          In-App Notifications
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "history" ? "bg-blue-500 text-white" : "bg-gray-100"}`}
          onClick={() => setActiveTab("history")}
        >
          Notification History
        </button>
      </div>
      
      {/* Email Form */}
      {activeTab === "email" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Send Email Notification</h2>
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Recipient Email:
              </label>
              <input
                type="email"
                name="email"
                value={emailForm.email}
                onChange={handleEmailChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Subject:
              </label>
              <input
                type="text"
                name="subject"
                value={emailForm.subject}
                onChange={handleEmailChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Message:
              </label>
              <textarea
                name="body"
                value={emailForm.body}
                onChange={handleEmailChange}
                className="w-full p-2 border rounded h-32"
              />
            </div>
            
            <button
              onClick={sendEmail}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {loading ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      )}
      
      {/* Rest of your component remains the same */}
      {/* SMS Form */}
      {activeTab === "sms" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Send SMS Notification</h2>
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Phone Number:
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={smsForm.phoneNumber}
                onChange={handleSmsChange}
                className="w-full p-2 border rounded"
                placeholder="+1234567890"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Message:
              </label>
              <textarea
                name="message"
                value={smsForm.message}
                onChange={handleSmsChange}
                className="w-full p-2 border rounded h-32"
                maxLength="160"
              />
            </div>
            
            <button
              onClick={sendSms}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {loading ? "Sending..." : "Send SMS"}
            </button>
          </div>
        </div>
      )}

      {/* In-App Notification Form */}
      {activeTab === "inapp" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Send In-App Notification</h2>
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Title:
              </label>
              <input
                type="text"
                name="title"
                value={inappForm.title}
                onChange={handleInappChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Message:
              </label>
              <textarea
                name="message"
                value={inappForm.message}
                onChange={handleInappChange}
                className="w-full p-2 border rounded h-32"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Type:
              </label>
              <select
                name="notification_type"
                value={inappForm.notification_type}
                onChange={handleInappChange}
                className="w-full p-2 border rounded"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            
            <button
              onClick={sendInappNotification}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {loading ? "Sending..." : "Send In-App Notification"}
            </button>
          </div>
        </div>
      )}
      
      {/* Notification History */}
      {activeTab === "history" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Notification History</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Email Notifications</h3>
            {notifications.email.length > 0 ? (
              <div className="border rounded overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Recipient</th>
                      <th className="p-2 text-left">Subject</th>
                      <th className="p-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.email.map((email) => (
                      <tr key={email.id} className="border-t">
                        <td className="p-2">{email.id}</td>
                        <td className="p-2">{email.email_to}</td>
                        <td className="p-2">{email.subject}</td>
                        <td className="p-2">{new Date(email.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No email notifications found</p>
            )}
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">SMS Notifications</h3>
            {notifications.sms.length > 0 ? (
              <div className="border rounded overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Recipient</th>
                      <th className="p-2 text-left">Message</th>
                      <th className="p-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.sms.map((sms) => (
                      <tr key={sms.id} className="border-t">
                        <td className="p-2">{sms.id}</td>
                        <td className="p-2">{sms.to}</td>
                        <td className="p-2">{sms.body}</td>
                        <td className="p-2">{new Date(sms.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No SMS notifications found</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">
              In-App Notifications
              {notifications.inapp.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="ml-4 bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded"
                >
                  Mark All as Read
                </button>
              )}
            </h3>
            
            {notifications.inapp.length > 0 ? (
              <div className="border rounded overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Title</th>
                      <th className="p-2 text-left">Message</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Read</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.inapp.map((notif) => (
                      <tr key={notif.id} className={`border-t ${!notif.read ? "bg-blue-50" : ""}`}>
                        <td className="p-2">{notif.id.substring(0, 8)}...</td>
                        <td className="p-2 font-medium">{notif.title}</td>
                        <td className="p-2">{notif.message}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 text-xs rounded ${getNotificationTypeStyle(notif.notification_type)}`}>
                            {notif.notification_type}
                          </span>
                        </td>
                        <td className="p-2">{notif.read ? "Yes" : "No"}</td>
                        <td className="p-2">{new Date(notif.created_at).toLocaleString()}</td>
                        <td className="p-2">
                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded"
                            >
                              Mark as Read
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No in-app notifications found</p>
            )}
          </div>
        </div>
      )}
      
      {/* CSS for animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}