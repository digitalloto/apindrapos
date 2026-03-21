/**
 * UPIE Edge — All Edge Computing Modules
 * Patent Pending — AIMCRS
 */

const EdgeProcessor = require('./edge-processor');
const MotionTracker = require('./motion-tracker');
const { NoiseReducer, KalmanFilter1D } = require('./noise-reducer');
const EdgeSync = require('./edge-sync');

module.exports = {
  EdgeProcessor,
  MotionTracker,
  NoiseReducer,
  KalmanFilter1D,
  EdgeSync
};
