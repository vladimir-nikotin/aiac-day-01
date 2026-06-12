export const config = () => ({
  agent: {
    history: {
      path: String(process.env.SESSION_HISTORY_JSON).trim() || 'history.json',
    },
  },
});
