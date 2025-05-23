async function createGroup(groupName) {
  try {
    const response = await fetch("https://chrome-extension-url-production-95bb.up.railway.app/api/groups/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: groupName,
      }),
    });

    const result = await response.json();
    if (result.status === "success") {
      return { status: true, message: result.message };
    } else {
      return { status: false, message: result.message };
    }
  } catch (error) {
    console.error("Error joining group:", error);
    return false;
  }
}

async function joinGroup(grpName, user) {
  try {
    const response = await fetch("https://chrome-extension-url-production-95bb.up.railway.app/api/groups/join", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        username: user,
        name: grpName,
      }),
    });

    const result = await response.json();
    if (result.message === "success") {
      chrome.storage.sync.set({
        status: true,
        groupId: result.data.groupId,
        groupName: result.data.groupName,
        userId: result.data.userId,
        username: result.data.username,
      });
      return { status: true, message: result.message };
    } else {
      return { status: false, message: result.message };
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
    const response = await fetch("https://chrome-extension-url-production-95bb.up.railway.app/api/groups/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: groupId,
        username: username,
        url: url,
        title: title,
        notes: notes,
        category: category,
      }),
    });

    const data = await response.json();
    
    shareUrl(username);
    if (data.status === "success") {
      return { status: true, message: data.message };
    } else {
      return { status: false, message: data.message };
    }
  } catch (error) {
    console.error("Error sharing URL:", error);
    return false;
  }
}

// fetched all bookmarks
async function fetchBookmarksFromServer(id) {
  try {
    const res = await fetch(`https://chrome-extension-url-production-95bb.up.railway.app/api/groups/${id}`);
    const data = await res.json();

    if (data.message === "success") {
      chrome.storage.sync.set({ bookmarks: data.urls });
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error fetching URLs:", error);
    return false;
  }
}

// Delete url
async function deleteBookmark(id) {
  try {
    const resJson = await fetch(`https://chrome-extension-url-production-95bb.up.railway.app/api/groups/${id}`, {
      method: "DELETE",
    });
    const res = await resJson.json();
    if (res.message === "success") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
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
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "fetchBookmarks") {
    chrome.storage.sync.get(["groupId"], function (data) {
      if (data.groupId) {
        (async () => {
          const success = await fetchBookmarksFromServer(data.groupId);
          sendResponse({ success: success });
        })();
      } else {
        sendResponse({ success: false, message: "No group ID found" });
      }
    });
    return true;
  } else if (request.action === "createGroup") {
    (async () => {
      const res = await createGroup(request.groupName);
      sendResponse({ success: res.status, message: res.message });
    })();
    return true;
  } else if (request.action === "joinGroup") {
    (async () => {
      const res = await joinGroup(request.groupname, request.username);
      sendResponse({ success: res.status, message: res.message });
    })();
    return true;
  } else if (request.action === "leaveGroup") {
    chrome.storage.sync.remove(
      ["status", "groupId", "userId", "username"],
      function () {
        sendResponse({ success: true });
      }
    );
    return true;
  } else if (request.action === "getJoinStatus") {
    chrome.storage.sync.get(
      ["status", "groupId", "groupName", "username"],
      function (data) {
        sendResponse({
          joined: data.status || false,
          groupId: data.groupId || "",
          groupName: data.groupName || "",
          username: data.username || "",
        });
      }
    );
    return true;
  } else if (request.action === "shareUrl") {
    chrome.storage.sync.get(["groupId", "username"], function (data) {
      if (data.groupId && data.username) {
        (async () => {
          const res = await shareUrlWithGroup(
            request.url,
            request.title,
            request.notes,
            request.category,
            data.groupId,
            data.username
          );
          sendResponse({ success: res.status, message: res.message });
        })();
      } else {
        sendResponse({
          success: false,
          message: "GroupId or Username not found",
        });
      }
    });
    return true;
  } else if (request.action === "deleteUrl") {
    (async () => {
      const success = await deleteBookmark(request.urlId);
      sendResponse({ success: success });
    })();
    return true;
  }
});

const socket = new WebSocket("wss://chrome-extension-url-production.up.railway.app");

chrome.storage.sync.get(["username"], function (data) {
  if (data.username) {
    socket.addEventListener("open", () => {
      console.log("WebSocket connected");
      socket.send(
        JSON.stringify({ type: "register", username: data.username })
      );
    });
  }
});

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  console.log("data",data);
  if (data.type === "new_url_shared") {  
      
    chrome.notifications.create({
      type: "basic",
      iconUrl:  chrome.runtime.getURL("images/icon-48.png"),
      title: `New URL Received From: ${data.sharedBy}`,
      message: "A new link has been shared in your group.",
    });
  }
});

function shareUrl(username) {  
  socket.send(
    JSON.stringify({
      type: "share_url",
      sharedBy: username,
    })
  );
}
