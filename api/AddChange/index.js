const { TableClient } = require("@azure/data-tables");
const crypto = require("crypto");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "UseDevelopmentStorage=true";
const tableClient = TableClient.fromConnectionString(connectionString, "ChangeRequests");

const PRIORITY_MATRIX = {
  "High-High": "Critical",
  "High-Medium": "High",
  "High-Low": "Medium",
  "Medium-High": "High",
  "Medium-Medium": "Medium",
  "Medium-Low": "Low",
  "Low-High": "Medium",
  "Low-Medium": "Low",
  "Low-Low": "Low"
};

function calculatePriority(impact, urgency) {
  return PRIORITY_MATRIX[`${impact}-${urgency}`] || "Medium";
}

module.exports = async function (context, req) {
  const { title, impact, urgency } = req.body || {};

  if (!title || !impact || !urgency) {
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: "Title, Impact, and Urgency are required" }
    };
    return;
  }

  try {
    await tableClient.createTable();
  } catch (err) {
    if (err.statusCode !== 409) {
      context.res = { status: 500, body: { error: "Failed to access table storage" } };
      return;
    }
  }

  const id = crypto.randomUUID();
  const priority = calculatePriority(impact, urgency);

  const entity = {
    partitionKey: "changes",
    rowKey: id,
    title,
    impact,
    urgency,
    priority,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  try {
    await tableClient.createEntity(entity);
    context.res = {
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: {
        id,
        title,
        impact,
        urgency,
        priority,
        status: "Pending",
        createdAt: entity.createdAt
      }
    };
  } catch (err) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Failed to create change request" }
    };
  }
};
