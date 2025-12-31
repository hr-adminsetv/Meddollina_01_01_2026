// // Simple Node script to POST a user and then GET the same user by email.
// // Usage: node backend/test/post_get_user.js
// // Requires Node 18+ (global fetch available)

// const BASE_URL = "http://localhost:5000/api/users";

// // create a unique email every run
// const email = `testuser+${Date.now()}@example.com`;

// const sampleUser = {
//   firstName: "Test",
//   lastName: "User",
//   email: email,
//   phoneNumber: "+91 99999 88888",
//   profession: "Physician",
//   department: "Cardiology",
//   specialization: "Interventional Cardiology",
//   yearsOfExperience: 5,
//   medicalLicenseId: "TEST-LIC-12345",
//   password: "temp123",
// };

// (async () => {
//   try {
//     // -----------------------
//     // 1️⃣ POST USER
//     // -----------------------
//     console.log("➡️ Creating user...");

//     const postRes = await fetch(BASE_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(sampleUser),
//     });

//     const postBody = await postRes.text();
//     console.log("POST status:", postRes.status);
//     console.log("POST response:", postBody);

//     // -----------------------
//     // 2️⃣ GET USER BY EMAIL
//     // -----------------------
//     console.log("\n➡️ Fetching user by email...");

//     const getRes = await fetch(`${BASE_URL}?email=${encodeURIComponent(email)}`);
//     const getBody = await getRes.text();

//     console.log("GET status:", getRes.status);
//     console.log("GET response:", getBody);
//   } catch (err) {
//     console.error("Request failed:", err);
//   }
// })();
