document.addEventListener("DOMContentLoaded", function () {
  // Get DOM elements - Save tab
  const currentUrlElement = document.getElementById("current-url");
  const notesInput = document.getElementById("notes");
  const categoryInput = document.getElementById("category");
  const shareButton = document.getElementById("share-btn");
  const tooltip = document.getElementById("tool-tip");
  const bookmarksList = document.getElementById("bookmarks-list");

  // Get DOM elements - Group tab
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  const groupNameInputCrt = document.getElementById("group-id-crt");
  const groupNameInput = document.getElementById("group-name");
  const usernameInput = document.getElementById("username");
  const createButton = document.getElementById("create-btn");
  const joinButton = document.getElementById("join-btn");
  const leaveButton = document.getElementById("leave-btn");
  const groupInfoDiv = document.getElementById("group-info");
  const joinFormDiv = document.getElementById("join-form");
  const currentGroupNameSpan = document.getElementById("current-group-name");
  const currentUsernameSpan = document.getElementById("current-username");

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

  //fetch existing bookmarks from server
  fetchBookmarks();

  // Load and display existing bookmarks
  loadBookmarks();

  checkConnectionStatus();

  function fetchBookmarks() {
    console.log("fetched Bookmarks");
    
    chrome.runtime.sendMessage(
      {
        action: "fetchBookmarks",
      },
      function (response) {
        if (response.success) {
          checkConnectionStatus();
          showNotification("Fetched all bookmarks");
          loadBookmarks();
        }
      }
    );
  }

  // Function to load bookmarks from storage
  function loadBookmarks() {
    console.log("Load Bookmarks");

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
            <button class="delete-btn" data-index="${index}" data-urlId="${
          bookmark._id
        }">Delete</button>
          `;

        bookmarkItem.innerHTML = bookmarkContent;
        bookmarksList.appendChild(bookmarkItem);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach(function (button) {
        button.addEventListener("click", function (e) {
          const index = parseInt(e.target.getAttribute("data-index"));
          const bookmarkId = e.target.getAttribute("data-urlId");
          deleteBookmark(index, bookmarkId);
        });
      });
    });
  }

  // Function to delete a bookmark
  function deleteBookmark(index, id) {
    chrome.runtime.sendMessage(
      {
        action: "deleteUrl",
        urlId: id,
      },
      function (response) {
        if (response.success) {
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
      }
    );
  }

  //function to check joined status
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
          currentGroupNameSpan.textContent = response.groupName;
          currentUsernameSpan.textContent = response.username;

          tooltip.textContent = `Joined Group: ${response.groupName}`;

          // Pre-fill connection form
          groupNameInputCrt.value = response.groupName;
          usernameInput.value = response.username;
        } else {
          // Update UI for disconnected state
          tooltip.textContent = "Join a group to share";
          statusIndicator.className = "leaved";
          statusText.textContent = "Leaved";
          shareButton.disabled = true;
          tooltip.style.display = "block";
          joinButton.style.display = "block";
          leaveButton.style.display = "none";
          joinFormDiv.style.display = "block";
          groupInfoDiv.style.display = "none";

          // Load saved connection info if available
          chrome.storage.sync.get(["groupName", "username"], function (data) {
            if (data.groupName) groupNameInputCrt.value = data.groupName;
            if (data.username) usernameInput.value = data.username;
          });
        }
      }
    );
  }

  // Function to show a temporary notification
  function showNotification(message) {

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

  //create group listener
  createButton.addEventListener("click", function () {
    const groupName = groupNameInput.value.trim();
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

  // Join button event listener
  joinButton.addEventListener("click", function () {
    const groupname = groupNameInputCrt.value.trim();
    const username = usernameInput.value.trim();

    if (!groupname || !username) {
      showNotification("Please fill in all fields");
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "joinGroup",
        groupname: groupname,
        username: username,
      },
      function (response) {
        if (response.success) {
          checkConnectionStatus();
          fetchBookmarks();
          showNotification("Joined group");
        }
      }
    );
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

            fetchBookmarks();
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

  // Leave button event listener
  leaveButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "leaveGroup" }, function (response) {
      if (response.success) {
        chrome.storage.sync.set({ bookmarks: [] }, function () {
          console.log("Bookmarks cleared after leaving the group.");
          loadBookmarks();
        });
        checkConnectionStatus();
        showNotification("Leave from group");
      }
    });
  });
});
