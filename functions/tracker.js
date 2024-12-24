// /.netlify/functions/tracker.js
const fs = require('fs');
const path = require('path');

// Path to the data file
const dataFilePath = path.resolve(__dirname, 'trackingData.json');

// Base64 representation of a 1x1 transparent GIF
const trackerImageBase64 = 
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

// Load tracking data from file
const loadTrackingData = () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading tracking data file:', error);
  }
  return {};
};

// Save tracking data to file
const saveTrackingData = (data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing tracking data file:', error);
  }
};

const trackingData = loadTrackingData();

exports.handler = async (event, context) => {
  const { httpMethod, queryStringParameters, headers } = event;

  if (httpMethod === 'GET') {
    const { trackerName } = queryStringParameters;

    if (!trackerName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'trackerName query parameter is required' }),
      };
    }

    const ipAddress = headers['x-forwarded-for'] || headers['client-ip'] || 'unknown';

    // If "trackerName" is already tracked, update the access time and IP
    if (trackingData[trackerName]) {
      trackingData[trackerName].hits.push({
        time: new Date().toISOString(),
        ip: ipAddress,
      });
    } else {
      trackingData[trackerName] = {
        trackerName,
        hits: [
          {
            time: new Date().toISOString(),
            ip: ipAddress,
          },
        ],
      };
    }

    saveTrackingData(trackingData);

    // Serve the tracker image
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: trackerImageBase64,
      isBase64Encoded: true,
    };
  }

  if (httpMethod === 'POST') {
    const { trackerName } = queryStringParameters;

    if (!trackerName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'trackerName query parameter is required' }),
      };
    }

    if (!trackingData[trackerName]) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No data found for the specified trackerName' }),
      };
    }

    // Return data for the specific trackerName
    return {
      statusCode: 200,
      body: JSON.stringify(trackingData[trackerName], null, 2),
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
