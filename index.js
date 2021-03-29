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
const eActiveDeed = {
  NONE: 0,
  NURSE_LEFT: 1,
  NURSE_RIGHT: 2,
  BOTTLE: 3,
  SLEEP: 4,
  DIAPER: 5,
  DIAPER_WET: 6,
  DIAPER_DIRTY: 7,
  CHOOSE_ACTIVITY: 999
};

const eNurseSide = {
  LEFT: 0,
  RIGHT: 1
};

const eDiaperType = {
  WET: 0,
  DIRTY: 1
};

// Models
var totzUserModel = {
  userId: "",
  email: ""
};

var babyModel = {
  firstName: "",
  lastName: "",
  birthDate: new Date(),
  gender: 0,
  createdByUserId: "",
  createDate: Date.now(),
  altCaretakerUserIds: [],
  nurse: [],
  bottle: [],
  sleep: [],
  diaper: []
};

var nurseModel = {
  createdByUserId: "",
  startDate: 0,
  durationLeft: 0,
  durationRight: 0,
  startSide: eNurseSide.LEFT,
  endSide: eNurseSide.RIGHT,
  isComplete: false,
  comments: ""
};

var bottleModel = {
  createdByUserId: "",
  startDate: 0,
  duration: 0,
  amountInOunces: 0,
  isComplete: false,
  comments: ""
};

var sleepModel = {
  createdByUserId: "",
  startDate: 0,
  duration: 0,
  isComplete: false,
  comments: ""
};

var diaperModel = {
  createdByUserId: "",
  startDate: 0,
  diaperType: eDiaperType.WET,
  comments: ""
};

// Deed Management
var currentDeed = eActiveDeed.NONE;
var isCurreentDeedPaused = false;

// Timer
const TIMER_DELAY = 1000;
var isTimerRunningLeft = false;
var timerStartLeft = 0;
var timerPauseLeft = 0;
var timerBuffLeft = 0;
var timeElapsedInSecondsLeft = 0;
var isTimerRunningRight = false;
var timerStartRight = 0;
var timerPauseRight = 0;
var timerBuffRight = 0;
var timeElapsedInSecondsRight = 0;

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
var currentBabyId = "";

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
      //getOrCreateTotzUser();
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
    currentDeed = eActiveDeed.CHOOSE_ACTIVITY;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnLeft.addEventListener("click", () => {
    runTimerLeft(true);
    currentDeed = eActiveDeed.NURSE_LEFT;
    isCurreentDeedPaused = false;
    handleStartDeed();
    updateCurrentActivity();
  });

  btnRight.addEventListener("click", () => {
    runTimerLeft(true);
    currentDeed = eActiveDeed.NURSE_RIGHT;
    isCurreentDeedPaused = false;
    handleStartDeed();
    updateCurrentActivity();
  });

  btnBottle.addEventListener("click", () => {
    runTimerLeft(true);
    currentDeed = eActiveDeed.BOTTLE;
    isCurreentDeedPaused = false;
    handleStartDeed();
    updateCurrentActivity();
  });

  btnSleep.addEventListener("click", () => {
    runTimerLeft(true);
    currentDeed = eActiveDeed.SLEEP;
    isCurreentDeedPaused = false;
    handleStartDeed();
    updateCurrentActivity();
  });

  btnDiaper.addEventListener("click", () => {
    currentDeed = eActiveDeed.DIAPER;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnCancelChoice.addEventListener("click", () => {
    currentDeed = eActiveDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnPause.addEventListener("click", () => {
    pauseTimerLeft();
    isCurreentDeedPaused = true;
    updateCurrentActivity();
  });

  btnSwapActive.addEventListener("click", () => {
    if (currentDeed == eActiveDeed.NURSE_LEFT) {
      currentDeed = eActiveDeed.NURSE_RIGHT;
    } else {
      currentDeed = eActiveDeed.NURSE_LEFT;
    }
    updateCurrentActivity();
  });

  btnStopActive.addEventListener("click", () => {
    handleStopDeed();
    resetTimerLeft();
    currentDeed = eActiveDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnCancelActive.addEventListener("click", () => {
    handleCancelDeed();
    resetTimerLeft();
    currentDeed = eActiveDeed.CHOOSE_ACTIVITY;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnResume.addEventListener("click", () => {
    runTimerLeft(true);
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnSwapPaused.addEventListener("click", () => {
    runTimerLeft(true);
    if (currentDeed == eActiveDeed.NURSE_LEFT) {
      currentDeed = eActiveDeed.NURSE_RIGHT;
    } else {
      currentDeed = eActiveDeed.NURSE_LEFT;
    }
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnStopPaused.addEventListener("click", () => {
    handleStopDeed();
    resetTimerLeft();
    currentDeed = eActiveDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnCancelPaused.addEventListener("click", () => {
    handleCancelDeed();
    resetTimerLeft();
    currentDeed = eActiveDeed.CHOOSE_ACTIVITY;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnWet.addEventListener("click", () => {
    currentDeed = eActiveDeed.DIAPER_WET;
    handleStartDeed();
    currentDeed = eActiveDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnDirty.addEventListener("click", () => {
    currentDeed = eActiveDeed.DIAPER_DIRTY;
    handleStartDeed();
    currentDeed = eActiveDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });

  btnCancelDiaper.addEventListener("click", () => {
    currentDeed = eActiveDeed.NONE;
    isCurreentDeedPaused = false;
    updateCurrentActivity();
  });
}
main();

function getOrCreateTotzUser() {
  const totzUserRef = firebase.firestore().collection("totzUser");

  totzUserRef
    .where("userId", "==", firebase.auth().currentUser.uid)
    .get()
    .then(querySnapshot => {
      if (querySnapshot.length > 0) {
        querySnapshot.forEach(doc => {
          // doc.data() is never undefined for query doc snapshots
          console.log(doc.id, " => ", doc.data());
        });
      } else {
        totzUserModel.userId = firebase.auth().currentUser.uid;
        totzUserModel.email = firebase.auth().currentUser.email;
        var docRef = totzUserRef.add(totzUserModel).then(docRef => {});
      }
    })
    .catch(error => {
      console.log("Error getting document:", error);
    });
}

function initUI() {
  // Hide some elements from the start. Determine when to show them later.
  addBabyButton.style.display = "none";
  addBabyContainer.style.display = "none";
  newUserBabyContainer.style.display = "none";
  recentActivityContainer.style.display = "none";

  updateCurrentActivity(eActiveDeed.NONE);

  // Listen to the form submission
  form.addEventListener("submit", e => {
    // Prevent the default form redirect
    e.preventDefault();

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
          altCaretakerUserIds: []
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
          console.log("Baby Id " + docSnapshot.id);
          console.log(docSnapshot.data());
          setBaby(docSnapshot.id, docSnapshot.data());
        });
      } else {
        // Allow user to select active baby
        console.log(babyCount + " babies");
        result.forEach(docSnapshot => {
          console.log("Baby Id " + docSnapshot.id);
          console.log(docSnapshot.data());
        });
        addBabyButton.style.display = "block";
      }
    });

    subscribeToNurses();
  } else {
    // Hide elements if user is logged out
    setBaby("", null);
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
  return babyArray;
}

function setBaby(id, baby) {
  if (id && baby) {
    currentBabyId = id;
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
  switch (currentDeed) {
    case eActiveDeed.NONE:
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
    case eActiveDeed.NURSE_LEFT:
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
    case eActiveDeed.NURSE_RIGHT:
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
    case eActiveDeed.BOTTLE:
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
    case eActiveDeed.SLEEP:
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
    case eActiveDeed.DIAPER:
      hide(rowStart);
      hide(rowActivities);
      hide(rowOngoing);
      hide(rowResume);
      show(rowDiaper);
      show(rowTimer);
      break;
    case eActiveDeed.CHOOSE_ACTIVITY:
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
  if (currentDeed == eActiveDeed.SLEEP || currentDeed == eActiveDeed.BOTTLE) {
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
function runTimerLeft(isButtonClick) {
  var now = Date.now();

  if (!isTimerRunningLeft) {
    if (isButtonClick) {
      // User triggered start/resume
      if (timerStartLeft == 0) {
        timerStartLeft = now;
      }

      if (timerPauseLeft > 0) {
        timerBuffLeft += now - timerPauseLeft;
        timerPauseLeft = 0;
      }

      isTimerRunningLeft = true;
    } else {
      // setTimeout callback, do nothing
    }
  }

  timeElapsedInSecondsLeft = (now - timerStartLeft - timerBuffLeft) / 1000;
  var timeElapsedTotal = timeElapsedInSecondsLeft + timeElapsedInSecondsRight;

  var min = Math.floor(timeElapsedTotal / 60);
  var sec = Math.floor(timeElapsedTotal % 60);

  sec++;
  if (sec == 60) {
    min++;
    sec = 0;
  }

  var minString = min < 10 ? "0" + min.toString() : min.toString();
  var secString = sec < 10 ? "0" + sec.toString() : sec.toString();

  if (isTimerRunningLeft) {
    spanMin.innerHTML = minString;
    spanSec.innerHTML = secString;

    setTimeout(function() {
      runTimerLeft(false);
    }, TIMER_DELAY);
  }
}

function pauseTimerLeft() {
  timerPauseLeft = Date.now();
  isTimerRunningLeft = false;
  console.log(
    "pauseTimerLeft() " +
      timerPauseLeft +
      " isTimerRunningLeft " +
      isTimerRunningLeft
  );
}

function resetTimerLeft() {
  isTimerRunningLeft = false;
  timerStartLeft = 0;
  timerPauseLeft = 0;
  timerBuffLeft = 0;
  timeElapsedInSecondsLeft = 0;

  console.log("resetTimerLeft()");
}

function runTimerRight(isButtonClick) {
  var now = Date.now();

  if (!isTimerRunningRight) {
    if (isButtonClick) {
      // User triggered start/resume
      if (timerStartRight == 0) {
        timerStartRight = now;
      }

      if (timerPauseRight > 0) {
        timerBuffRight += now - timerPauseRight;
        timerPauseRight = 0;
      }

      isTimerRunningRight = true;
    } else {
      // setTimeout callback, do nothing
    }
  }

  timeElapsedInSecondsRight = (now - timerStartRight - timerBuffRight) / 1000;
  var timeElapsedTotal = timeElapsedInSecondsLeft + timeElapsedInSecondsRight;

  var min = Math.floor(timeElapsedTotal / 60);
  var sec = Math.floor(timeElapsedTotal % 60);

  sec++;
  if (sec == 60) {
    min++;
    sec = 0;
  }

  var minString = min < 10 ? "0" + min.toString() : min.toString();
  var secString = sec < 10 ? "0" + sec.toString() : sec.toString();

  if (isTimerRunningRight) {
    spanMin.innerHTML = minString;
    spanSec.innerHTML = secString;

    setTimeout(function() {
      runTimerRight(false);
    }, TIMER_DELAY);
  }
}

function pauseTimerRight() {
  timerPauseRight = Date.now();
  isTimerRunningRight = false;
  console.log(
    "pauseTimerRight() " +
      timerPauseRight +
      " isTimerRunningRight " +
      isTimerRunningRight
  );
}

function resetTimerRight() {
  isTimerRunningRight = false;
  timerStartRight = 0;
  timerPauseRight = 0;
  timerBuffRight = 0;
  timeElapsedInSecondsRight = 0;

  console.log("resetTimerRight()");
}

// Handle Actions For Deeds
function handleStartDeed() {}

function handleStopDeed() {
  switch (currentDeed) {
    case eActiveDeed.NURSE_LEFT:
    case eActiveDeed.NURSE_RIGHT:
      console.log("Handle stop deed. Save nurse.");
      addNurse();
      break;
    case eActiveDeed.BOTTLE:
      console.log("Handle stop deed. Save bottle.");
      break;
    case eActiveDeed.SLEEP:
      console.log("Handle stop deed. Save sleep.");
      break;
    default:
      console.log("Handle stop deed. Nothing to save.");
      break;
  }
}

function handleCancelDeed() {}

// Save Deeds
function addNurse() {
  var nurseStartDate = 0;
  var nurseStartSide = eNurseSide.LEFT;

  if (timerStartRight == 0) {
    nurseStartDate = timerStartLeft;
  } else if (timerStartLeft == 0) {
    nurseStartDate = timerStartRight;
    nurseStartSide = eNurseSide.RIGHT;
  } else {
    nurseStartDate =
      timerStartLeft < timerStartRight ? timerStartLeft : timerStartRight;
    nurseStartSide =
      timerStartLeft < timerStartRight ? eNurseSide.LEFT : eNurseSide.RIGHT;
  }

  nurseModel.createdByUserId = firebase.auth().currentUser.uid;
  nurseModel.startDate = nurseStartDate;
  nurseModel.durationLeft = timeElapsedInSecondsLeft;
  nurseModel.durationRight = timeElapsedInSecondsRight;
  nurseModel.startSide = nurseStartSide;
  nurseModel.endSide =
    currentDeed == eActiveDeed.NURSE_LEFT ? eNurseSide.LEFT : eNurseSide.RIGHT;
  nurseModel.isComplete = true;
  //nurseModel.comments = textNurseComments.value; //TODO: Add comments text field and retrieve babyGenderValue

  const babyRef = firebase
    .firestore()
    .collection("baby")
    .doc(currentBabyId);
  if (babyRef) {
    babyRef
      .collection("nurse")
      .add(nurseModel)
      .then(nurseRef => {
        console.log("Nurse added to baby written with ID: ", nurseRef.id);
      })
      .catch(error => {
        console.error("Error adding nurse to baby: ", error);
      });
  }
}

function addBottle() {}

function addSleep() {}

function addDiaper() {}

// Subscribe/Unsubscribe

var unsubscribe;

function subscribeToNurses() {
  unsubscribe = firebase
    .firestore()
    .collection("baby")
    .where("createdByUserId", "==", firebase.auth().currentUser.uid)
    .get()
    .onSnapshot(querySnapshot => {
      console.log("Nurse for baby " + currentBabyId);
      querySnapshot.forEach(doc => {
        var nurseList = doc.collection("nurse").get();
        nurseList.forEach(nurse => {
          console.log(doc.data());
        });
      });
    });
}

function unsubscribeFromNurses() {
  unsubscribe();
}
