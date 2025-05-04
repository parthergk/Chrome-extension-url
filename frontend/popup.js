document.addEventListener("DOMContentLoaded", function () {
  // Get DOM elements - Save tab
  const currentUrlElement = document.getElementById("current-url");
  const notesInput = document.getElementById("notes");
  const categoryInput = document.getElementById("category");
  const saveButton = document.getElementById("save-btn");
  const shareButton = document.getElementById("share-btn");
  const bookmarksList = document.getElementById("bookmarks-list");

  // Get DOM elements - Group tab
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const groupIdInput = document.getElementById("group-id");
  const usernameInput = document.getElementById("username");
  const createButton = document.getElementById("create-btn");
  const joinButton = document.getElementById("join-btn");
  const leaveButton = document.getElementById("leave-btn");
  const groupInfoDiv = document.getElementById('group-info');
  const joinFormDiv = document.getElementById('join-form');
  const currentGroupIdSpan = document.getElementById('current-group-id');
  const currentUsernameSpan = document.getElementById('current-username');

  let currentUrl = "";
  let currentTitle = "";
  let isConnected = false;

  // Tab switching logic
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");

      // Update active tab button
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      // Show active tab content
      tabContents.forEach((content) => content.classList.remove("active"));
      document.getElementById(tabId).classList.add("active");

      if (tabId === "group-tab") {
        checkConnectionStatus();
      }
    });
  });

  // Get the current tab URL and display it
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    currentUrl = activeTab.url;
    currentTitle = activeTab.title;

    currentUrlElement.textContent = `${currentTitle}: ${currentUrl}`;
  });

  // Load and display existing bookmarks
  loadBookmarks();

  checkConnectionStatus();

  // Save button event listener
  saveButton.addEventListener("click", function () {
    const notes = notesInput.value.trim();
    const category = categoryInput.value.trim();

    if (currentUrl) {
      // Create bookmark object
      const bookmark = {
        url: currentUrl,
        title: currentTitle,
        notes: notes,
        category: category,
        date: new Date().toLocaleString(),
      };

      // Save to Chrome storage
      chrome.storage.sync.get("bookmarks", function (data) {
        let bookmarks = data.bookmarks || [];
        bookmarks.push(bookmark);

        chrome.storage.sync.set({ bookmarks: bookmarks }, function () {
          // Clear form fields
          notesInput.value = "";
          categoryInput.value = "";

          // Update the display
          loadBookmarks();
        });
      });
    }
  });

  // Share button event listener
  shareButton.addEventListener("click", function () {
    const notes = notesInput.value.trim();
    const category = categoryInput.value.trim();

    if (currentUrl && isConnected) {
      
      chrome.runtime.sendMessage(
        {
        action: "shareUrl",
        url: currentUrl,
        title: currentTitle,
        notes: notes,
        category: category,
      },
      function (response) {
        if (response.success) {
          showNotification("URL shared with group!");

          // Clear form fields
          notesInput.value = "";
          categoryInput.value = "";
        } else {
          showNotification("Failed to share URL. Please check connection.");
        }
      }
    );
  }
  });

  // Function to load bookmarks from storage
  function loadBookmarks() {
    chrome.storage.sync.get("bookmarks", function (data) {
      const bookmarks = data.bookmarks || [];

      // Clear existing bookmarks display
      bookmarksList.innerHTML = "";

      if (bookmarks.length === 0) {
        bookmarksList.innerHTML =
          '<div class="no-bookmarks">No bookmarks saved yet.</div>';
        return;
      }

      // Display each bookmark
      bookmarks.forEach(function (bookmark, index) {
        const bookmarkItem = document.createElement("div");
        bookmarkItem.className = "bookmark-item";

        const bookmarkContent = `
            <a href="${bookmark.url}" class="bookmark-url" target="_blank">${
          bookmark.title
        }</a>
            <div class="bookmark-notes">${bookmark.notes || "No notes"}</div>
            ${
              bookmark.category
                ? `<span class="bookmark-category">${bookmark.category}</span>`
                : ""
            }
            <button class="delete-btn" data-index="${index}">Delete</button>
          `;

        bookmarkItem.innerHTML = bookmarkContent;
        bookmarksList.appendChild(bookmarkItem);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach(function (button) {
        button.addEventListener("click", function (e) {
          const index = parseInt(e.target.getAttribute("data-index"));
          deleteBookmark(index);
        });
      });
    });
  }

  // Function to delete a bookmark
  function deleteBookmark(index) {
    chrome.storage.sync.get("bookmarks", function (data) {
      let bookmarks = data.bookmarks || [];

      // Remove the bookmark at the specified index
      bookmarks.splice(index, 1);

      // Save the updated bookmarks
      chrome.storage.sync.set({ bookmarks: bookmarks }, function () {
        // Update the display
        loadBookmarks();
      });
    });
  }

  //create group listener
  createButton.addEventListener("click", function () {
    const groupName = groupIdInput.value.trim();    
    if (!groupName) {
      showNotification("Please fill in all fields");
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "createGroup",
        groupName: groupName,
      },
      function (response) {
        if (response.success) {
          showNotification("Created group");
        }
      }
    );
  });

  function checkConnectionStatus() {
    
    chrome.runtime.sendMessage(
      { action: "getJoinStatus" },
      function (response) {        
        isConnected = response.joined;
        if (isConnected) {
          // Update UI for connected state
          statusIndicator.className = "joined";
          statusText.textContent = "Joined";
          shareButton.disabled = false;
          joinButton.style.display = "none";
          leaveButton.style.display = "block";
          joinFormDiv.style.display = "none";
          groupInfoDiv.style.display = "block";

          // Update group info
          currentGroupIdSpan.textContent = response.groupId;
          currentUsernameSpan.textContent = response.username;

          // Pre-fill connection form
          groupIdInput.value = response.groupId;
          usernameInput.value = response.username;
        } else {
          // Update UI for disconnected state
          statusIndicator.className = "leaved";
          statusText.textContent = "Leaved";
          shareButton.disabled = true;
          joinButton.style.display = "block";
          leaveButton.style.display = "none";
          joinFormDiv.style.display = "block";
          groupInfoDiv.style.display = "none";

          // Load saved connection info if available
          chrome.storage.sync.get(["groupId", "username"], function (data) {
            if (data.groupId) groupIdInput.value = data.groupId;
            if (data.username) usernameInput.value = data.username;
          });
        }
      }
    );
  }

  // Join button event listener
  joinButton.addEventListener("click", function () {
    const groupId = groupIdInput.value.trim();
    const username = usernameInput.value.trim();

    if (!groupId || !username) {
      showNotification("Please fill in all fields");
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "joinGroup",
        groupId: groupId,
        username: username,
      },
      function (response) {
        if (response.success) {
          checkConnectionStatus();
          showNotification("Joined group");
        }
      }
    );
  });

  // Leave button event listener
  leaveButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "leaveGroup" }, function (response) {
      if (response.success) {
        checkConnectionStatus();
        showNotification("Leave from group");
      }
    });
  });

  // Function to show a temporary notification
  function showNotification(message) {
    console.log("notification from create group");
    
    const notification = document.createElement("div");
    notification.className = "notification";
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove notification after a delay
    setTimeout(function () {
      notification.style.opacity = "0";
      setTimeout(function () {
        document.body.removeChild(notification);
      }, 500);
    }, 2000);
  }
});
