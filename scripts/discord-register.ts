const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
if (!applicationId || !botToken) throw new Error("Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN before registering commands.");

const command = {
  name: "ironpath",
  description: "Share RuneLite-verified Iron Path progress with your clan",
  integration_types: [0],
  contexts: [0],
  options: [
    { type: 1, name: "link", description: "Connect your Discord identity to Iron Path" },
    { type: 1, name: "join", description: "Select the character that represents you in this clan", options: [
      { type: 3, name: "character", description: "Exact RuneScape character name (defaults to your first journal)", required: false },
    ] },
    { type: 1, name: "profile", description: "Share your public Iron Path showcase" },
    { type: 1, name: "recent", description: "Share your latest achievement" },
    { type: 1, name: "setup", description: "Configure this clan's achievement channel", options: [
      { type: 7, name: "channel", description: "Channel that receives achievement posts", required: true, channel_types: [0, 5] },
    ] },
  ],
};

const response = await fetch(`https://discord.com/api/v10/applications/${applicationId}/commands`, {
  method: "POST",
  headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
  body: JSON.stringify(command),
});
if (!response.ok) throw new Error(`Discord command registration failed (${response.status}): ${await response.text()}`);
const registered = await response.json() as { id: string; name: string };
console.log(`Registered /${registered.name} (${registered.id}).`);
