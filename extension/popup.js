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

      tabButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

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

    chrome.runtime.sendMessage(
      {
        action: "fetchBookmarks",
      },
      function (response) {
        if (response.success) {
          checkConnectionStatus();
          loadBookmarks();
        } else {
          showNotification(response.message || "No group ID found");
        }
      }
    );
  }

  // Function to load bookmarks from storage
  function loadBookmarks() {

    chrome.storage.sync.get("bookmarks", function (data) {
      const bookmarks = data.bookmarks || [];

      bookmarksList.innerHTML = "";

      if (bookmarks.length === 0) {
        bookmarksList.innerHTML =
          '<div class="no-bookmarks">No bookmarks saved yet.</div>';
        return;
      }

      function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
      }

      // Display each bookmark
      bookmarks.forEach(function (bookmark, index) {
        const bookmarkItem = document.createElement("div");
        bookmarkItem.className = "bookmark-item";

        const bookmarkContent = `
        <div class = "url-cont">
            <a href="${bookmark.url}" class="bookmark-url" target="_blank">${
          bookmark.title
        }</a>
            <div class="bookmark-notes">${escapeHTML(bookmark.notes) || "No notes"}</div>
            ${
              bookmark.category
                ? `<span class="bookmark-category">${escapeHTML(bookmark.category)}</span>`
                : ""
            }</div>
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

            bookmarks.splice(index, 1);

            chrome.storage.sync.set({ bookmarks: bookmarks }, function () {
              loadBookmarks();
            });
          });
          showNotification("Url deleted");
        } else {
          showNotification("Something went wrong");
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
          statusText.textContent = "Not joined any group";
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

    setTimeout(function () {
      notification.style.opacity = "0";
      setTimeout(function () {
        document.body.removeChild(notification);
      }, 500);
    }, 2000);
  }

  // create group listener
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
          showNotification( response.message || "Created group");
        } else {
          showNotification( response.message || "Not created something went wrong");
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
          showNotification(response.message || "Joined group");
        } else {
          showNotification(response.message || "Not joined something went wrong");
        }
      }
    );
  });

  // Share button event listener
  const handleShare = function () {
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
          
          showNotification(response.message || "URL shared with group!");
          fetchBookmarks();
          
          notesInput.value = "";
          categoryInput.value = "";
        } else {
          showNotification(
            response.message ||
              "Failed to share URL."
          );
        }
      }
    );
  }
};

shareButton.addEventListener("click", throttle(handleShare, 2000));

  function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

  // Leave button event listener
  leaveButton.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "leaveGroup" }, function (response) {
      if (response.success) {
        chrome.storage.sync.set({ bookmarks: [] }, function () {
          loadBookmarks();
        });
        checkConnectionStatus();
        showNotification("Leave from group");
      }
    });
  });
});
