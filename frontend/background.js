let groupId = null;
let username = null;

async function joinGroup(gId, user) {
  groupId = gId;
  username = user;

  try {
    const response = await fetch("http://localhost:3000/groups/share", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        id: groupId,
      }),
    });

    const data = await response.json();

    if (data.message === "success") {
      chrome.storage.sync.set({
        groupId: data.groupId,
        username: data.username,
      });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error joining group:", error);
    return false;
  }
}

// Share URL with group
async function shareUrlWithGroup(
  url,
  title,
  notes,
  category,
  groupId,
  username
) {
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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "joinGroup") {
    (async () => {
      const success = joinGroup(request.groupId, request.username);
      sendResponse({ success: success });
    })();
    return true;
  } else if (request.action === "leaveGroup") {
    // Disconnect from WebSocket
    // if (socket) {
    //   socket.close();
    //   socket = null;
    // }
    // chrome.storage.sync.set({ websocketConnected: false });
    sendResponse({ success: true });
  } else if (request.action === "shareUrl") {
    chrome.storage.sync.get(["groupId", "username"], function (data) {
      // If we have stored connection info
      if (data.groupId && data.username) {
        (async () => {
          const success = await shareUrlWithGroup(
            request.url,
            request.title,
            request.notes,
            request.category,
            data.groupId,
            data.username
          );
          sendResponse({ success: success });
        })();
      }
    });
    return true;
  }
});
