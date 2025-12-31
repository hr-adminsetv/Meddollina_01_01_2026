// Simple Node script to POST a sample waitlist entry to the running server.
// Usage: node backend/test/post_waitlist.js
// Requires Node 18+ (global fetch available) or run with a fetch polyfill.

const url = "http://localhost:5000/api/waitlist/";

const sample = {
  type: "Healthcare Professional",
  firstName: "Test",
  lastName: "User",
  email: `testuser+${Date.now()}@example.com`,
  phoneNumber: "+1234567890",
  profession: "Doctor",
  department: "Cardiology",
  specialization: "Interventional",
};

(async () => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample),
    });

    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response body:", text);
  } catch (err) {
    console.error("Request failed:", err);
  }
})();
