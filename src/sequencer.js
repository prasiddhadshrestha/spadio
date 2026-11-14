export class FrameSequencer {
  constructor() {
    this.frames = [];
    this.labels = [];
    this.currentIndex = 0;
    this.analyzedFrames = [];
  }

  setTrackFrames(imageUrls, labels = []) {
    this.frames = imageUrls || [];
    this.labels = labels;
    this.currentIndex = 0;
    this.analyzedFrames = [];
  }

  getFrameCount() {
    return this.frames.length;
  }

  getCurrentLabel() {
    if (!this.labels.length) return `Frame ${this.currentIndex + 1}`;
    return this.labels[this.currentIndex] || `Frame ${this.currentIndex + 1}`;
  }

  getPreviousBands() {
    if (this.currentIndex > 0 && this.analyzedFrames[this.currentIndex - 1]) {
      return this.analyzedFrames[this.currentIndex - 1].bands;
    }
    return null;
  }

  storeAnalysis(index, result) {
    this.analyzedFrames[index] = result;
  }

  advance() {
    if (this.frames.length <= 1) return false;
    this.currentIndex = (this.currentIndex + 1) % this.frames.length;
    return true;
  }
}
