// Import stylesheets
import "./style.css";

// Firebase App (the core Firebase SDK) is always required and must be listed first
import firebase from "firebase/app";

// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/firestore";

import * as firebaseui from "firebaseui";

import datepicker from "js-datepicker";

// Enums
const activeDeed = {
  NONE: 0,
  NURSE_LEFT: 1,
  NURSE_RIGHT: 2,
  BOTTLE: 3,
  SLEEP: 4,
  DIAPER: 5,
  CHOOSE_ACTIVITY: 999
};

// Deed Management
var currentDeed = activeDeed.NONE;
var isCurreentDeedPaused = false;

// Timer
const TIMER_DELAY = 1000;
var isTimerRunning = false;
var timerStart = 0;
var timerPause = 0;
var timerBuff = 0;

// Header
const loginButton = document.getElementById("btnLogin");
const currentBabyContainer = document.getElementById("current-baby-container");

// MAIN
const loggedInContent = document.getElementById("logged-in-content");

// Add Baby Form
const addBabyContainer = document.getElementById("add-baby-container");
const addBabyButton = document.getElementById("btnAddBaby");
const newUserBabyContainer = document.getElementById("new-user-baby-container");

const form = document.getElementById("add-baby");
const babyFirstName = document.getElementById("first_name");
const babyLastName = document.getElementById("last_name");
const babyBirthDate = document.getElementById("birth_date");
const birthDatePicker = datepicker("#birth_date", {
  formatter: (input, date, instance) => {
    const value = date.toLocaleDateString("en-US");
    input.value = value; // => '1/1/2099'
  }
});

// Current Activity
const currentActivityContainer = document.getElementById(
  "current-activity-container"
);
const rowStart = document.getElementById("row-start");
const rowActivities = document.getElementById("row-activities");
const rowOngoing = document.getElementById("row-ongoing");
const rowResume = document.getElementById("row-resume");
const rowDiaper = document.getElementById("row-diaper");
const rowTimer = document.getElementById("row-timer");

const btnStart = document.getElementById("button-start");

const btnLeft = document.getElementById("button-left");
const btnRight = document.getElementById("button-right");
const btnBottle = document.getElementById("button-bottle");
const btnSleep = document.getElementById("button-sleep");
const btnDiaper = document.getElementById("button-diaper");
const btnCancelChoice = document.getElementById("button-cancel-choice");

const btnPause = document.getElementById("button-pause");
const btnSwapActive = document.getElementById("button-swap-active");
const btnStopActive = document.getElementById("button-stop-active");
const btnCancelActive = document.getElementById("button-cancel-active");

const btnResume = document.getElementById("button-resume");
const btnSwapPaused = document.getElementById("button-swap-paused");
const btnStopPaused = document.getElementById("button-stop-paused");
const btnCancelPaused = document.getElementById("button-cancel-paused");

const btnWet = document.getElementById("button-wet");
const btnDirty = document.getElementById("button-dirty");
const btnCancelDiaper = document.getElementById("button-cancel-diaper");

const spanMin = document.getElementById("timer-min");
const spanSec = document.getElementById("timer-sec");
const spanActivityText = document.getElementById("activity-text");

// Recent Actvitiy
const recentActivityContainer = document.getElementById(
  "recent-activity-container"
);

// Current App State
var currentBaby = null;

async function main() {
  // Add Firebase project configuration object here
  var firebaseConfig = {
    apiKey: "AIzaSyDuTdgqAffCMmr_L8AP8kfEgtKQnJqgTmc",
    authDomain: "totztracker.firebaseapp.com",
    projectId: "totztracker",
    storageBucket: "totztracker.appspot.com",
    messagingSenderId: "710371674262",
    appId: "1:710371674262:web:1ea0fc27b82f1c16d49ab7",
    measurementId: "G-KF24WNBP46"
  };

  firebase.initializeApp(firebaseConfig);

  // FirebaseUI config
  const uiConfig = {
    credentialHelper: firebaseui.auth.CredentialHelper.NONE,
    signInOptions: [
      // Email / Password Provider.
      firebase.auth.EmailAuthProvider.PROVIDER_ID
    ],
    callbacks: {
      signInSuccessWithAuthResult: function(authResult, redirectUrl) {
        // Handle sign-in.
        // Return false to avoid redirect.
        return false;
      }
    }
  };

  const authUi = new firebaseui.auth.AuthUI(firebase.auth());

  hide(loggedInContent);

  // Called when the user clicks the LOGIN button
  loginButton.addEventListener("click", () => {
    if (firebase.auth().currentUser) {
      // User is signed in; allows user to sign out
      firebase.auth().signOut();
    } else {
      // No user is signed in; allows user to sign in
      authUi.start("#firebaseui-auth-container", uiConfig);
    }
  });

  // Listen to the current Auth state
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      loginButton.textContent = "LOGOUT";
      // Show logged-in content to logged-in users
      show(loggedInContent);
      initUI();
    } else {
      loginButton.textContent = "LOGIN";
      // Hide logged-in content from non-logged-in users
      hide(loggedInContent);
      initUI();
    }
  });

  // Activity Button Actions
  btnStart.addEventListener("click", () => {
    currentDeed = activeDeed.CHOOSE_ACTIVITY;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnLeft.addEventListener("click", () => {
    runTimer(true);
    currentDeed = activeDeed.NURSE_LEFT;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnRight.addEventListener("click", () => {
    runTimer(true);
    currentDeed = activeDeed.NURSE_RIGHT;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnBottle.addEventListener("click", () => {
    runTimer(true);
    currentDeed = activeDeed.BOTTLE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnSleep.addEventListener("click", () => {
    runTimer(true);
    currentDeed = activeDeed.SLEEP;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnDiaper.addEventListener("click", () => {
    currentDeed = activeDeed.DIAPER;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnCancelChoice.addEventListener("click", () => {
    currentDeed = activeDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnPause.addEventListener("click", () => {
    pauseTimer();
    isCurreentDeedPaused = true;
    updateCurrentActivity();
  });

  btnSwapActive.addEventListener("click", () => {
    if (currentDeed == activeDeed.NURSE_LEFT) {
      currentDeed = activeDeed.NURSE_RIGHT;
    } else {
      currentDeed = activeDeed.NURSE_LEFT;
    }
    updateCurrentActivity();
  });

  btnStopActive.addEventListener("click", () => {
    resetTimer();
    currentDeed = activeDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnCancelActive.addEventListener("click", () => {
    resetTimer();
    currentDeed = activeDeed.CHOOSE_ACTIVITY;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnResume.addEventListener("click", () => {
    runTimer(true);
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnSwapPaused.addEventListener("click", () => {
    runTimer(true);
    if (currentDeed == activeDeed.NURSE_LEFT) {
      currentDeed = activeDeed.NURSE_RIGHT;
    } else {
      currentDeed = activeDeed.NURSE_LEFT;
    }
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnStopPaused.addEventListener("click", () => {
    resetTimer();
    currentDeed = activeDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnCancelPaused.addEventListener("click", () => {
    resetTimer();
    currentDeed = activeDeed.CHOOSE_ACTIVITY;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnWet.addEventListener("click", () => {
    currentDeed = activeDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnDirty.addEventListener("click", () => {
    currentDeed = activeDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnCancelDiaper.addEventListener("click", () => {
    currentDeed = activeDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });
}
main();

function initUI() {
  // Hide some elements from the start. Determine when to show them later.
  addBabyButton.style.display = "none";
  addBabyContainer.style.display = "none";
  newUserBabyContainer.style.display = "none";
  recentActivityContainer.style.display = "none";

  updateCurrentActivity(activeDeed.NONE);

  // Listen to the form submission
  form.addEventListener("submit", e => {
    // Prevent the default form redirect
    e.preventDefault();

    console.log("saving baby");

    // Write a new object to the database collection "baby"
    var babyGenderRadios = document.getElementsByName("gender");
    var babyGenderValue = 0;

    for (var i = 0, length = babyGenderRadios.length; i < length; i++) {
      if (babyGenderRadios[i].checked) {
        babyGenderValue = babyGenderRadios[i].value;
        break;
      }
    }

    if (
      babyFirstName.value &&
      babyLastName.value &&
      babyBirthDate.value &&
      babyGenderValue
    ) {
      var babyBirthDateArray = babyBirthDate.value.split("/");
      var month = babyBirthDateArray[0];
      var day = babyBirthDateArray[1];
      var year = babyBirthDateArray[2];

      firebase
        .firestore()
        .collection("baby")
        .add({
          firstName: babyFirstName.value,
          lastName: babyLastName.value,
          birthDate: new Date(Date.UTC(year, month, day)),
          gender: babyGenderValue,
          createdByUserId: firebase.auth().currentUser.uid,
          createDate: Date.now(),
          caretakerUserIds: []
        });
    }

    // clear input fields
    babyFirstName.value = "";
    babyLastName.value = "";
    babyBirthDate.value = "";

    initUI();

    // Return false to avoid redirect
    return false;
  });

  // Display some elements if user is logged-in
  if (firebase.auth().currentUser) {
    // Check if user has any babies
    getBabiesCreatedByOrCaretaker().then(result => {
      const babyCount = result.length;
      if (babyCount == 0) {
        // Display Add Baby form
        addBabyContainer.style.display = "block";
        newUserBabyContainer.style.display = "block";
        addBabyButton.style.display = "none";
      } else if (babyCount == 1) {
        // Set active baby
        console.log("1 baby");
        result.forEach(docSnapshot => {
          setBaby(docSnapshot.data());
        });
      } else {
        // Allow user to select active baby
        console.log(babyCount + " babies");
        result.forEach(docSnapshot => {
          console.log(docSnapshot.data());
        });
        addBabyButton.style.display = "block";
      }
    });
  } else {
    // Hide elements if user is logged out
    setBaby(null);
  }
}

async function getBabiesCreatedByOrCaretaker() {
  const babyRef = firebase.firestore().collection("baby");
  const isCreatedBy = babyRef
    .where("createdByUserId", "==", firebase.auth().currentUser.uid)
    .get();
  const isCaretaker = babyRef
    .where(
      "caretakerUserIds",
      "array-contains",
      firebase.auth().currentUser.uid
    )
    .get();

  const [createdByQuerySnapshot, caretakerQuerySnapshot] = await Promise.all([
    isCreatedBy,
    isCaretaker
  ]);

  const createdByArray = createdByQuerySnapshot.docs;
  const caretakerArray = caretakerQuerySnapshot.docs;

  const babyArray = createdByArray.concat(caretakerArray);
  console.log("getBabiesCreatedByOrCaretaker() baby array " + babyArray.length);
  return babyArray;
}

function setBaby(baby) {
  if (baby) {
    currentBaby = baby;
    recentActivityContainer.style.display = "block";
    addBabyButton.style.display = "block";
    currentBabyContainer.innerHTML =
      "<span>" + currentBaby.firstName + "</span>";
  } else {
    currentBabyContainer.innerHTML = "";
    addBabyButton.style.display = "none";
  }
}

function updateCurrentActivity() {
  console.log(
    "updateCurrentActivity() " + currentDeed + " " + isCurreentDeedPaused
  );
  switch (currentDeed) {
    case activeDeed.NONE:
      show(rowStart);
      hide(rowActivities);
      hide(rowOngoing);
      hide(rowResume);
      hide(rowDiaper);
      show(rowTimer);
      spanActivityText.innerHTML = "Since Last Nurse (Right)";
      //TODO: Remove this. Pull time since last activity from firestore
      spanMin.innerHTML = "00";
      spanSec.innerHTML = "00";
      break;
    case activeDeed.NURSE_LEFT:
      hide(rowStart);
      hide(rowActivities);
      if (isCurreentDeedPaused) {
        hide(rowOngoing);
        show(rowResume);
      } else {
        show(rowOngoing);
        hide(rowResume);
      }
      hide(rowDiaper);
      show(rowTimer);
      spanActivityText.innerHTML = "Active Nurse (Left)";
      break;
    case activeDeed.NURSE_RIGHT:
      hide(rowStart);
      hide(rowActivities);
      if (isCurreentDeedPaused) {
        hide(rowOngoing);
        show(rowResume);
      } else {
        show(rowOngoing);
        hide(rowResume);
      }
      hide(rowDiaper);
      show(rowTimer);
      spanActivityText.innerHTML = "Active Nurse (Right)";
      break;
    case activeDeed.BOTTLE:
      hide(rowStart);
      hide(rowActivities);
      if (isCurreentDeedPaused) {
        hide(rowOngoing);
        show(rowResume);
      } else {
        show(rowOngoing);
        hide(rowResume);
      }
      hide(rowDiaper);
      show(rowTimer);
      spanActivityText.innerHTML = "Active Bottle";
      break;
    case activeDeed.SLEEP:
      hide(rowStart);
      hide(rowActivities);
      if (isCurreentDeedPaused) {
        hide(rowOngoing);
        show(rowResume);
      } else {
        show(rowOngoing);
        hide(rowResume);
      }
      hide(rowDiaper);
      show(rowTimer);
      spanActivityText.innerHTML = "Active Sleep";
      break;
    case activeDeed.DIAPER:
      hide(rowStart);
      hide(rowActivities);
      hide(rowOngoing);
      hide(rowResume);
      show(rowDiaper);
      show(rowTimer);
      break;
    case activeDeed.CHOOSE_ACTIVITY:
      hide(rowStart);
      show(rowActivities);
      hide(rowOngoing);
      hide(rowResume);
      hide(rowDiaper);
      show(rowTimer);
      break;
    default:
      console.log("Unknown activeDeed type " + currentDeed);
      break;
  }

  // Special Cases: btnSwapActive and btnSwapPaused
  // Hide for Sleep and Bottle
  if (currentDeed == activeDeed.SLEEP || currentDeed == activeDeed.BOTTLE) {
    hide(btnSwapActive);
    hide(btnSwapPaused);
  } else {
    show(btnSwapActive, "inline-flex");
    show(btnSwapPaused, "inline-flex");
  }
}

// UI HELPER FUNCTIONS
function show(element, display = "block") {
  element.style.display = display;
}

function hide(element) {
  element.style.display = "none";
}

// Timer
function runTimer(isButtonClick) {
  var now = Date.now();

  if (!isTimerRunning) {
    if (isButtonClick) {
      // User triggered start/resume
      if (timerStart == 0) {
        timerStart = now;
      }

      if (timerPause > 0) {
        timerBuff += now - timerPause;
        timerPause = 0;
      }

      isTimerRunning = true;
    } else {
      // setTimeout callback, do nothing
    }
  }

  var timeElapsedInSeconds = (now - timerStart - timerBuff) / 1000;
  var min = Math.floor(timeElapsedInSeconds / 60);
  var sec = Math.floor(timeElapsedInSeconds % 60);

  sec++;
  if (sec == 60) {
    min++;
    sec = 0;
  }

  var minString = min < 10 ? "0" + min.toString() : min.toString();
  var secString = sec < 10 ? "0" + sec.toString() : sec.toString();

  console.log(
    "runTimer(isButtonClick) " +
      isButtonClick +
      ", start " +
      timerStart +
      ", pause " +
      timerPause +
      ", buff " +
      timerBuff +
      ", timeElepsedInSeconds " +
      timeElapsedInSeconds
  );

  if (isTimerRunning) {
    spanMin.innerHTML = minString;
    spanSec.innerHTML = secString;

    setTimeout(function() {
      runTimer(false);
    }, TIMER_DELAY);
  }
}

function pauseTimer() {
  timerPause = Date.now();
  isTimerRunning = false;
  console.log(
    "pauseTimer() " + timerPause + " isTimerRunning " + isTimerRunning
  );
}

function resetTimer() {
  isTimerRunning = false;
  timerStart = 0;
  timerPause = 0;
  timerBuff = 0;

  console.log("resetTimer()");
}
