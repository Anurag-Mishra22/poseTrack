import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

let isInitialized = false;

export async function initializeTensorFlow() {
  if (isInitialized) {
    return;
  }

  try {
    await tf.setBackend("webgl");
    await tf.ready();
    isInitialized = true;
    console.log("TensorFlow.js initialized successfully");
  } catch (error) {
    console.error("Failed to initialize TensorFlow.js:", error);
  }
}
