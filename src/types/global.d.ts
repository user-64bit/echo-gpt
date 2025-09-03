export { };

declare global {
  interface Window {
    echoGptMutationTimeout: setTimeout
  }
}