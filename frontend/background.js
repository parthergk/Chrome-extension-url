async function createGroup(groupName) {
  try {
    const response = await fetch("http://localhost:3000/groups/create",{
      method:"POST",
      headers: {
        "Content-Type": "application/json"
      },
      body:JSON.stringify({
        name:groupName
      })  
    });

    const result = await response.json();
    if (result.message==="success") {
      return true
    }else{
      return false
    }
  } catch (error) {
    console.error("Error joining group:", error);
    return false
  }
}
async function joinGroup(grpName, user) {
  try {
    const response = await fetch("http://localhost:3000/groups/join", {
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

// Listen for installation event
chrome.runtime.onInstalled.addListener(function() {
  console.log('URL Bookmarker extension installed!');
  
  // Initialize storage with empty bookmarks array if it doesn't exist
  chrome.storage.sync.get('bookmarks', function(data) {
    if (!data.bookmarks) {
      chrome.storage.sync.set({bookmarks: []});
    }
  });
  
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "createGroup") {
    (async ()=>{
      const success = await createGroup(request.groupName);
      sendResponse({ success: success });
    })();
    return true;
  }else if (request.action === "joinGroup") {
    (async () => {
      const success = await joinGroup(request.groupname, request.username);
      sendResponse({ success: success });
    })();
    return true;
  } else if (request.action === "leaveGroup") {
    chrome.storage.sync.remove(['status','groupId', 'userId', 'username'], function () {
      sendResponse({ success: true });
    });
    return true
  }else if (request.action === "getJoinStatus") {    
    chrome.storage.sync.get(
      ['status', 'groupId', 'groupName', 'username'], 
      function(data) {  
        sendResponse({
          joined: data.status || false,
          groupId: data.groupId || '',
          groupName: data.groupName || '',
          username: data.username || ''
        });
      }
    );
    return true;
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
