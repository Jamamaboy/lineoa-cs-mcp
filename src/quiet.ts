// Node's built-in SQLite prints an "ExperimentalWarning" on first use. It is harmless and confuses
// people at a terminal, so that one warning type is hidden; every other warning still prints.
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.name !== "ExperimentalWarning") console.error(w);
});
