// Background script runs persistently in the background

let groupId = null;
let username = null;

// Initialize WebSocket connection
function initializeWebSocket() {
  // Get saved connection settings
  chrome.storage.sync.get(
    ["websocketUrl", "groupId", "username"],
    function (data) {
      // If we have stored connection info
      if (data.websocketUrl && data.groupId && data.username) {
        joinGroup(data.websocketUrl, data.groupId, data.username);
      }
    }
  );
}

// Connect to WebSocket server
async function joinGroup(gId, user) {
  groupId = gId;
  username = user;

  try {
    const response = await fetch("http://localhost:3000/groups/share", {
        method: "POST",
        headers: {
            "Content-type": "application/json"
        },
        body:JSON.stringify({
            username: username,
            id: groupId
        })
      });
    
      const data = await response.json();
    
      if (data.message==="success") {
        // chrome.storage.sync.set({
        //     groupId: data.groupId,
        //     username: data.username,
        //   });
        return true
      }else{
        return false
      } 
  } catch (error) {
    console.error("Error joining group:", error);
    return false
  }




  // Listen for messages
  socket.addEventListener("message", function (event) {
    const message = JSON.parse(event.data);

    // Handle different message types
    switch (message.type) {
      case "url_shared":
        // Add the shared URL to bookmarks
        addSharedUrlToBookmarks(message);

        // Send notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "images/icon-48.png",
          title: "URL Shared",
          message: `${message.username} shared: ${message.title}`,
        });
        break;

      case "user_joined":
        // Notify when a new user joins the group
        chrome.notifications.create({
          type: "basic",
          iconUrl: "images/icon-48.png",
          title: "New Member",
          message: `${message.username} joined the group`,
        });
        break;
    }
  });

  // Handle connection close
  socket.addEventListener("close", function (event) {
    console.log("WebSocket connection closed");
    chrome.storage.sync.set({ websocketConnected: false });
  });

  // Handle errors
  socket.addEventListener("error", function (event) {
    console.error("WebSocket error:", event);
    chrome.storage.sync.set({ websocketConnected: false });
  });
}

// Add shared URL to bookmarks
function addSharedUrlToBookmarks(message) {
  const bookmark = {
    url: message.url,
    title: message.title,
    notes: message.notes || "",
    category: message.category || "Shared",
    date: new Date().toLocaleString(),
    sharedBy: message.username,
  };

  chrome.storage.sync.get("bookmarks", function (data) {
    let bookmarks = data.bookmarks || [];
    bookmarks.push(bookmark);
    chrome.storage.sync.set({ bookmarks: bookmarks });
  });
}

// Share URL with group
async function shareUrlWithGroup(url, title, notes, category, groupId, username) {
    try {
      const response = await fetch("http://localhost:3000/groups/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: groupId,
          username: username,
          url: url,
        }),
      });
  
      const data = await response.json();
  
      if (data.message === "success") {
        return true;
      } else {
        return false;
      }
  
    } catch (error) {
      console.error("Error sharing URL:", error);
      return false;
    }
  }
  

// Listen for installation event
chrome.runtime.onInstalled.addListener(function () {
  console.log("URL Bookmarker extension installed!");

  // Initialize storage with empty bookmarks array if it doesn't exist
  chrome.storage.sync.get("bookmarks", function (data) {
    if (!data.bookmarks) {
      chrome.storage.sync.set({ bookmarks: [] });
    }
  });

  // Initialize WebSocket connection if credentials exist
  initializeWebSocket();
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "joinGroup") {
    // Connect to WebSocket server with provided details
    joinGroup(request.groupId, request.username);
    sendResponse({ success: true });
  } else if (request.action === "disconnectHttps") {
    // Disconnect from WebSocket
    if (socket) {
      socket.close();
      socket = null;
    }
    chrome.storage.sync.set({ websocketConnected: false });
    sendResponse({ success: true });
  } else if (request.action === "shareUrl") {
    // Share URL with the group
    const success = shareUrlWithGroup(
      request.url,
      request.title,
      request.notes,
      request.category
    );
    sendResponse({ success: success });
  }
});

// Optional: Context menu for quick bookmarking
chrome.contextMenus.create({
  id: "quickSave",
  title: "Quick save to URL Bookmarker",
  contexts: ["page"],
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "quickSave") {
    // Save the current page with default values
    const bookmark = {
      url: tab.url,
      title: tab.title,
      notes: "",
      category: "Quick Save",
      date: new Date().toLocaleString(),
    };

    chrome.storage.sync.get("bookmarks", function (data) {
      let bookmarks = data.bookmarks || [];
      bookmarks.push(bookmark);

      chrome.storage.sync.set({ bookmarks: bookmarks }, function () {
        // Show a notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "images/icon-48.png",
          title: "URL Saved",
          message: "The URL has been saved to your bookmarks.",
        });
      });
    });
  }
});
