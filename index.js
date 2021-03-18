// Import stylesheets
import "./style.css";

// Firebase App (the core Firebase SDK) is always required and must be listed first
import firebase from "firebase/app";

// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/firestore";

import * as firebaseui from "firebaseui";

import datepicker from "js-datepicker";

// Document elements
const loginButton = document.getElementById("btnLogin");
const loggedInContent = document.getElementById("logged-in-content");
const addBabyContainer = document.getElementById("add-baby-container");
const addBabyButton = document.getElementById("btnAddBaby");
const newUserBabyContainer = document.getElementById("new-user-baby-container");
const currentBabyContainer = document.getElementById("current-baby-container");
const currentActivityContainer = document.getElementById(
  "current-activity-container"
);
const recentActivityContainer = document.getElementById(
  "recent-activity-container"
);

// Add Baby form elements
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
      loggedInContent.style.display = "block";
      initUI();
    } else {
      loginButton.textContent = "LOGIN";
      // Hide logged-in content from non-logged-in users
      loggedInContent.style.display = "none";
      initUI();
    }
  });

  initUI();
}
main();

function initUI() {
  // Hide some elements from the start. Determine when to show them later.
  addBabyButton.style.display = "none";
  addBabyContainer.style.display = "none";
  newUserBabyContainer.style.display = "none";
  recentActivityContainer.style.display = "none";

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
      firebase
        .firestore()
        .collection("baby")
        .add({
          firstName: babyFirstName.value,
          lastName: babyLastName.value,
          birthDate: new Date(babyBirthDate.value),
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
