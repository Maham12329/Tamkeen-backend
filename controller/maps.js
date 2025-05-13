const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/places", async (req, res) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_API_KEY
  const query = req.query.query;

  if (!query) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      res.json(response.data);
    } else {
      res.status(404).json({ error: "No results found", details: response.data });
    }
  } catch (error) {
    console.error("Error fetching places:", error.message);
    res.status(500).json({ error: "Error fetching places" });
  }
});

module.exports = router;
