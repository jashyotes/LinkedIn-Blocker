const toggleButton = document.getElementById("toggleButton");
const challengeDiv = document.getElementById("challengeContainer");
const challengeText = document.getElementById("challengeText");
const challengeInput = document.getElementById("challengeInput");
const confirmButton = document.getElementById("confirmButton");
const errorMsg = document.getElementById("errorMsg");
const port = chrome.runtime.connect({ name: "popup" });
const customDisableButton = document.getElementById("customDisableButton");

let timerInterval = null;
let currentResumeTime = null;

customDisableButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "requestCustomChallenge" }, (response) => {
    showChallenge(response.challenge, true);
  });
});

function refreshState() {
  chrome.runtime.sendMessage({ type: "getStatus" }, (res) => {
    const { isBlocking, resumeTime, challengeActive } = res;
    currentResumeTime = resumeTime;

    if (isBlocking) {
      toggleButton.textContent = "Disable for 5 min";
      toggleButton.style.display = "block";
      customDisableButton.style.display = "block";
    } else {
      updateCountdownButton(resumeTime);
      startCountdown(resumeTime);
      toggleButton.style.display = "block";
      customDisableButton.style.display = "none";
    }

    toggleButton.disabled = challengeActive;
    customDisableButton.disabled = challengeActive || !isBlocking;
  });
}

toggleButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "getStatus" }, (res) => {
    if (res.isBlocking) {
      chrome.runtime.sendMessage({ type: "requestChallenge" }, (response) => {
        showChallenge(response.challenge);
      });
    } else {
      chrome.runtime.sendMessage({ type: "reEnableNow" }, (res) => {
        if (res.success) {
          if (timerInterval) clearInterval(timerInterval);
          refreshState();
        }
      });
    }
  });
});


function showChallenge(code, isCustom = false) {
  toggleButton.style.display = "none";
  customDisableButton.style.display = "none";
  challengeDiv.style.display = "block";
  challengeText.innerText = code;
  challengeInput.value = '';
  errorMsg.style.display = 'none';
  challengeInput.focus();

  const customMinutesInput = document.getElementById("customMinutesInput");
  if (isCustom) {
    customMinutesInput.style.display = "block";
  } else {
    customMinutesInput.style.display = "none";
  }

  challengeInput.addEventListener('copy', (e) => e.preventDefault());
  challengeInput.addEventListener('cut', (e) => e.preventDefault());
  challengeInput.addEventListener('paste', (e) => e.preventDefault());
  challengeInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['v', 'c', 'x'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });

  confirmButton.onclick = () => {
    const answer = challengeInput.value.trim();
    const minutes = isCustom ? parseInt(customMinutesInput.value) : null;

    if (isCustom && (isNaN(minutes) || minutes <= 0 || minutes > 60)) {
      errorMsg.textContent = "Enter a valid time (1–60 mins)";
      errorMsg.style.display = "block";
      return;
    }

    chrome.runtime.sendMessage({ type: "submitChallenge", answer, minutes }, (res) => {
      if (res.success) {
        challengeDiv.style.display = "none";
        toggleButton.style.display = "block";
        customDisableButton.style.display = "block";
        refreshState();
      } else {
        errorMsg.textContent = "Incorrect — try again.";
        errorMsg.style.display = "block";
      }
    });
  };


  challengeInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      confirmButton.click();
    }
  };
}

function startCountdown(resumeTime) {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => updateCountdownButton(resumeTime), 1000);
}

function updateCountdownButton(resumeTime) {
  const remainingMs = resumeTime - Date.now();
  if (remainingMs > 0) {
    const min = Math.floor(remainingMs / 60000);
    const sec = Math.floor((remainingMs % 60000) / 1000);
    toggleButton.textContent = `Re-enabling in ${min}:${sec < 10 ? '0' : ''}${sec}...`;
  } else {
    clearInterval(timerInterval);
    refreshState();
  }
}

document.addEventListener("DOMContentLoaded", refreshState);
