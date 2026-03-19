const { TableClient } = require("@azure/data-tables");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "UseDevelopmentStorage=true";
const tableClient = TableClient.fromConnectionString(connectionString, "ChangeRequests");

module.exports = async function (context, req) {
  const { id } = req.body || {};

  if (!id) {
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: "Change Request ID is required" }
    };
    return;
  }

  try {
    const entity = await tableClient.getEntity("changes", id);
    entity.status = "Approved";
    await tableClient.updateEntity(entity, "Merge");

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { id, status: "Approved" }
    };
  } catch (err) {
    if (err.statusCode === 404) {
      context.res = {
        status: 404,
        headers: { "Content-Type": "application/json" },
        body: { error: "Change Request not found" }
      };
    } else {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { error: "Failed to update change request" }
      };
    }
  }
};
