const { TableClient } = require("@azure/data-tables");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "UseDevelopmentStorage=true";
const tableClient = TableClient.fromConnectionString(connectionString, "ChangeRequests");

module.exports = async function (context, req) {
  try {
    await tableClient.createTable();
  } catch (err) {
    if (err.statusCode !== 409) {
      context.res = { status: 500, body: { error: "Failed to access table storage" } };
      return;
    }
  }

  const changes = [];
  const entities = tableClient.listEntities();

  for await (const entity of entities) {
    changes.push({
      id: entity.rowKey,
      title: entity.title,
      impact: entity.impact,
      urgency: entity.urgency,
      priority: entity.priority,
      status: entity.status,
      createdAt: entity.createdAt
    });
  }

  changes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: changes
  };
};
